import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidenavComponent } from './sidenav.component';
import { BasicRestService } from 'src/app/service/basic-rest.service';
import {
  DocumentTree,
  DocumentFlatNode,
  ROOT_ID,
  TRASH_ID,
  PINNED_ID,
} from 'src/app/service/document-tree-service';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { HttpClientModule } from '@angular/common/http';
import { LlmDialogService } from 'src/app/service/llm-dialog.service';
import { ConfigDialogService } from 'src/app/service/config-dialog-service';
import { Clipboard } from '@angular/cdk/clipboard';

describe('SidenavComponent', () => {
  let component: SidenavComponent;
  let fixture: ComponentFixture<SidenavComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockLlmDialogService: jasmine.SpyObj<LlmDialogService>;
  let mockConfigDialogService: jasmine.SpyObj<ConfigDialogService>;
  let mockClipboard: jasmine.SpyObj<Clipboard>;
  let mockDocumentTree: jasmine.SpyObj<DocumentTree>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate'], { url: '/home' });
    mockLlmDialogService = jasmine.createSpyObj('LlmDialogService', [
      'openDialog',
      'closeDialog',
    ]);
    mockConfigDialogService = jasmine.createSpyObj('ConfigDialogService', [
      'openDialog',
      'closeDialog',
    ]);
    mockClipboard = jasmine.createSpyObj('Clipboard', ['copy']);
    mockDocumentTree = jasmine.createSpyObj('DocumentTree', [
      'addNewItem',
      'refreshTree',
      'deleteEmptyItem',
      'moveToTrash',
      'removeFromTrash',
      'saveItem',
      'restoreItem',
      'pinItem',
      'isExpanded',
      'expandNode',
      'dropNode',
    ]);

    await TestBed.configureTestingModule({
      declarations: [SidenavComponent],
      imports: [HttpClientModule],
      providers: [
        BasicRestService,
        { provide: DocumentTree, useValue: mockDocumentTree },
        { provide: Router, useValue: mockRouter },
        { provide: LlmDialogService, useValue: mockLlmDialogService },
        { provide: ConfigDialogService, useValue: mockConfigDialogService },
        { provide: Clipboard, useValue: mockClipboard },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: '123' }),
            paramMap: of({
              get: () => '123',
            }),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SidenavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('setOperatingSystem', () => {
    it('should detect Windows', () => {
      spyOnProperty(navigator, 'userAgent').and.returnValue(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      );
      component.setOperatingSystem();
      expect(component.operatingSystem).toBe('Windows');
    });

    it('should detect Mac', () => {
      spyOnProperty(navigator, 'userAgent').and.returnValue(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      );
      component.setOperatingSystem();
      expect(component.operatingSystem).toBe('Mac');
    });

    it('should detect Linux', () => {
      spyOnProperty(navigator, 'userAgent').and.returnValue(
        'Mozilla/5.0 (X11; Linux x86_64)',
      );
      component.setOperatingSystem();
      expect(component.operatingSystem).toBe('Linux');
    });

    it('should detect Android', () => {
      spyOnProperty(navigator, 'userAgent').and.returnValue(
        'Mozilla/5.0 (Linux; Android 10)',
      );
      component.setOperatingSystem();
      expect(component.operatingSystem).toBe('Android');
    });

    it('should detect iOS', () => {
      spyOnProperty(navigator, 'userAgent').and.returnValue(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)',
      );
      component.setOperatingSystem();
      expect(component.operatingSystem).toBe('iOS');
    });
  });

  describe('commandKey', () => {
    it('should return ⌘ for Mac', () => {
      component.operatingSystem = 'Mac';
      expect(component.commandKey()).toBe('⌘');
    });

    it('should return Ctrl for Windows', () => {
      component.operatingSystem = 'Windows';
      expect(component.commandKey()).toBe('Ctrl');
    });

    it('should return Ctrl for Linux', () => {
      component.operatingSystem = 'Linux';
      expect(component.commandKey()).toBe('Ctrl');
    });
  });

  describe('node type checks', () => {
    it('isRoot should return true for root node', () => {
      const node: DocumentFlatNode = {
        id: ROOT_ID,
        name: 'root',
        parent: '',
        deleted: false,
        pinned: false,
        editNode: false,
        level: 0,
        expandable: true,
      };
      expect(component.isRoot(0, node)).toBe(true);
    });

    it('isRoot should return false for non-root node', () => {
      const node: DocumentFlatNode = {
        id: 'some-id',
        name: 'test',
        parent: ROOT_ID,
        deleted: false,
        pinned: false,
        editNode: false,
        level: 1,
        expandable: false,
      };
      expect(component.isRoot(0, node)).toBe(false);
    });

    it('isTrash should return true for trash node', () => {
      const node: DocumentFlatNode = {
        id: TRASH_ID,
        name: 'trash',
        parent: '',
        deleted: false,
        pinned: false,
        editNode: false,
        level: 0,
        expandable: true,
      };
      expect(component.isTrash(0, node)).toBe(true);
    });

    it('isTrash should return false for non-trash node', () => {
      const node: DocumentFlatNode = {
        id: 'some-id',
        name: 'test',
        parent: ROOT_ID,
        deleted: false,
        pinned: false,
        editNode: false,
        level: 1,
        expandable: false,
      };
      expect(component.isTrash(0, node)).toBe(false);
    });

    it('isPinned should return true for pinned node', () => {
      const node: DocumentFlatNode = {
        id: PINNED_ID,
        name: 'pinned',
        parent: '',
        deleted: false,
        pinned: false,
        editNode: false,
        level: 0,
        expandable: true,
      };
      expect(component.isPinned(0, node)).toBe(true);
    });

    it('isPinned should return false for non-pinned node', () => {
      const node: DocumentFlatNode = {
        id: 'some-id',
        name: 'test',
        parent: ROOT_ID,
        deleted: false,
        pinned: false,
        editNode: false,
        level: 1,
        expandable: false,
      };
      expect(component.isPinned(0, node)).toBe(false);
    });
  });

  describe('node state checks', () => {
    it('hasChild should return true for expandable node', () => {
      const node: DocumentFlatNode = {
        id: 'test',
        name: 'test',
        parent: ROOT_ID,
        deleted: false,
        pinned: false,
        editNode: false,
        level: 1,
        expandable: true,
      };
      expect(component.hasChild(0, node)).toBe(true);
    });

    it('hasChild should return false for non-expandable node', () => {
      const node: DocumentFlatNode = {
        id: 'test',
        name: 'test',
        parent: ROOT_ID,
        deleted: false,
        pinned: false,
        editNode: false,
        level: 1,
        expandable: false,
      };
      expect(component.hasChild(0, node)).toBe(false);
    });

    it('hasNoContent should return true for empty name', () => {
      const node: DocumentFlatNode = {
        id: 'test',
        name: '',
        parent: ROOT_ID,
        deleted: false,
        pinned: false,
        editNode: false,
        level: 1,
        expandable: false,
      };
      expect(component.hasNoContent(0, node)).toBe(true);
    });

    it('hasNoContent should return false for non-empty name', () => {
      const node: DocumentFlatNode = {
        id: 'test',
        name: 'Test Document',
        parent: ROOT_ID,
        deleted: false,
        pinned: false,
        editNode: false,
        level: 1,
        expandable: false,
      };
      expect(component.hasNoContent(0, node)).toBe(false);
    });

    it('editNode should return true when node is in edit mode', () => {
      const node: DocumentFlatNode = {
        id: 'test',
        name: 'test',
        parent: ROOT_ID,
        deleted: false,
        pinned: false,
        editNode: true,
        level: 1,
        expandable: false,
      };
      expect(component.editNode(0, node)).toBe(true);
    });

    it('editNode should return false when node is not in edit mode', () => {
      const node: DocumentFlatNode = {
        id: 'test',
        name: 'test',
        parent: ROOT_ID,
        deleted: false,
        pinned: false,
        editNode: false,
        level: 1,
        expandable: false,
      };
      expect(component.editNode(0, node)).toBe(false);
    });
  });

  describe('onMenuToggle', () => {
    it('should toggle showSidebar from true to false', () => {
      component.showSidebar = true;
      component.onMenuToggle();
      expect(component.showSidebar).toBe(false);
    });

    it('should toggle showSidebar from false to true', () => {
      component.showSidebar = false;
      component.onMenuToggle();
      expect(component.showSidebar).toBe(true);
    });
  });

  describe('drag state', () => {
    it('dragStart should set dragging to true', () => {
      component.dragging = false;
      component.dragStart();
      expect(component.dragging).toBe(true);
    });

    it('dragEnd should set dragging to false', () => {
      component.dragging = true;
      component.dragEnd();
      expect(component.dragging).toBe(false);
    });
  });

  describe('dragHover', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should expand node after delay when dragging', () => {
      component.dragging = true;
      const node: DocumentFlatNode = {
        id: 'test',
        name: 'test',
        parent: ROOT_ID,
        deleted: false,
        pinned: false,
        editNode: false,
        level: 1,
        expandable: true,
      };

      component.dragHover(node);
      jasmine.clock().tick(component.expandDelay + 1);

      expect(mockDocumentTree.expandNode).toHaveBeenCalledWith(node);
    });

    it('should not expand node when not dragging', () => {
      component.dragging = false;
      const node: DocumentFlatNode = {
        id: 'test',
        name: 'test',
        parent: ROOT_ID,
        deleted: false,
        pinned: false,
        editNode: false,
        level: 1,
        expandable: true,
      };

      component.dragHover(node);
      jasmine.clock().tick(component.expandDelay + 1);

      expect(mockDocumentTree.expandNode).not.toHaveBeenCalled();
    });
  });

  describe('dragHoverEnd', () => {
    it('should clear timeout when dragging', () => {
      component.dragging = true;
      component.expandTimeout = setTimeout(() => {}, 1000);
      spyOn(window, 'clearTimeout');

      component.dragHoverEnd();

      expect(window.clearTimeout).toHaveBeenCalled();
    });

    it('should not clear timeout when not dragging', () => {
      component.dragging = false;
      spyOn(window, 'clearTimeout');

      component.dragHoverEnd();

      expect(window.clearTimeout).not.toHaveBeenCalled();
    });
  });

  describe('cancelEditItem', () => {
    it('should set editNode to false and refresh tree', () => {
      const node: DocumentFlatNode = {
        id: 'test',
        name: 'test',
        parent: ROOT_ID,
        deleted: false,
        pinned: false,
        editNode: true,
        level: 1,
        expandable: false,
      };

      component.cancelEditItem(node);

      expect(node.editNode).toBe(false);
      expect(mockDocumentTree.refreshTree).toHaveBeenCalled();
    });
  });

  describe('editItem', () => {
    it('should set editNode to true and refresh tree', () => {
      const node: DocumentFlatNode = {
        id: 'test',
        name: 'test',
        parent: ROOT_ID,
        deleted: false,
        pinned: false,
        editNode: false,
        level: 1,
        expandable: false,
      };

      // Mock getElementById for focus call
      const mockElement = { focus: jasmine.createSpy('focus') };
      spyOn(document, 'getElementById').and.returnValue(
        mockElement as unknown as HTMLElement,
      );

      component.editItem(node);

      expect(node.editNode).toBe(true);
      expect(mockDocumentTree.refreshTree).toHaveBeenCalled();
    });
  });

  describe('document tree delegations', () => {
    let testNode: DocumentFlatNode;

    beforeEach(() => {
      testNode = {
        id: 'test',
        name: 'test',
        parent: ROOT_ID,
        deleted: false,
        pinned: false,
        editNode: false,
        level: 1,
        expandable: false,
      };
    });

    it('deleteEmptyItem should delegate to documentTree', () => {
      component.deleteEmptyItem(testNode);
      expect(mockDocumentTree.deleteEmptyItem).toHaveBeenCalledWith(testNode);
    });

    it('moveToTrash should delegate to documentTree', () => {
      component.moveToTrash(testNode);
      expect(mockDocumentTree.moveToTrash).toHaveBeenCalledWith(testNode);
    });

    it('restoreItem should delegate to documentTree', () => {
      component.restoreItem(testNode);
      expect(mockDocumentTree.restoreItem).toHaveBeenCalledWith(testNode);
    });

    it('pinItem should delegate to documentTree', () => {
      component.pinItem(testNode);
      expect(mockDocumentTree.pinItem).toHaveBeenCalledWith(testNode);
    });

    it('saveItem should delegate to documentTree', () => {
      component.saveItem(testNode, 'new name', true);
      expect(mockDocumentTree.saveItem).toHaveBeenCalledWith(
        testNode,
        'new name',
        true,
      );
    });

    it('isExpanded should delegate to documentTree', () => {
      mockDocumentTree.isExpanded.and.returnValue(true);
      const result = component.isExpanded(testNode);
      expect(mockDocumentTree.isExpanded).toHaveBeenCalledWith(testNode);
      expect(result).toBe(true);
    });
  });

  describe('removeFromTrash', () => {
    it('should call documentTree.removeFromTrash when user confirms', () => {
      const node: DocumentFlatNode = {
        id: 'test',
        name: 'Test Document',
        parent: TRASH_ID,
        deleted: true,
        pinned: false,
        editNode: false,
        level: 1,
        expandable: false,
      };

      spyOn(window, 'confirm').and.returnValue(true);

      component.removeFromTrash(node);

      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to permanently delete Test Document?',
      );
      expect(mockDocumentTree.removeFromTrash).toHaveBeenCalledWith(node);
    });

    it('should not call documentTree.removeFromTrash when user cancels', () => {
      const node: DocumentFlatNode = {
        id: 'test',
        name: 'Test Document',
        parent: TRASH_ID,
        deleted: true,
        pinned: false,
        editNode: false,
        level: 1,
        expandable: false,
      };

      spyOn(window, 'confirm').and.returnValue(false);

      component.removeFromTrash(node);

      expect(mockDocumentTree.removeFromTrash).not.toHaveBeenCalled();
    });
  });

  describe('toggleDarkMode', () => {
    beforeEach(() => {
      spyOn(localStorage, 'setItem');
      spyOn(document.documentElement.style, 'setProperty');
    });

    it('should toggle darkmode from false to true', () => {
      component.darkmode = false;
      component.toggleDarkMode();
      expect(component.darkmode).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith('darkmode', 'true');
    });

    it('should toggle darkmode from true to false', () => {
      component.darkmode = true;
      component.toggleDarkMode();
      expect(component.darkmode).toBe(false);
      expect(localStorage.setItem).toHaveBeenCalledWith('darkmode', 'false');
    });
  });

  describe('setTheme', () => {
    beforeEach(() => {
      spyOn(document.documentElement.style, 'setProperty');
    });

    it('should set dark theme CSS variables when darkmode is true', () => {
      component.darkmode = true;
      component.setTheme();

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--background-color',
        'var(--dark-theme-background-color)',
      );
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--font-color',
        'var(--dark-theme-font-color)',
      );
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--border-width',
        '1px',
      );
    });

    it('should set light theme CSS variables when darkmode is false', () => {
      component.darkmode = false;
      component.setTheme();

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--background-color',
        'var(--light-theme-background-color)',
      );
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--font-color',
        'var(--light-theme-font-color)',
      );
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--border-width',
        '2px',
      );
    });
  });

  describe('openZettelkasten', () => {
    it('should set showZettelkasten to true and navigate to notebox', () => {
      component.showZettelkasten = false;
      component.openZettelkasten();

      expect(component.showZettelkasten).toBe(true);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/notebox']);
    });
  });

  describe('openConfigDialog', () => {
    it('should call configDialogService.openDialog', () => {
      component.openConfigDialog();
      expect(mockConfigDialogService.openDialog).toHaveBeenCalled();
    });
  });

  describe('openLlmDialog', () => {
    it('should show alert when config is missing', () => {
      spyOn(localStorage, 'getItem').and.returnValue(null);
      spyOn(window, 'alert');

      component.openLlmDialog();

      expect(window.alert).toHaveBeenCalledWith(
        'Please configure your LLM settings first. Click on the LLM config button in the user menu popup.',
      );
      expect(mockLlmDialogService.openDialog).not.toHaveBeenCalled();
    });

    it('should show alert when llm config is empty string', () => {
      spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify({ llm: '' }));
      spyOn(window, 'alert');

      component.openLlmDialog();

      expect(window.alert).toHaveBeenCalled();
      expect(mockLlmDialogService.openDialog).not.toHaveBeenCalled();
    });

    it('should open dialog when config has llm set', () => {
      spyOn(localStorage, 'getItem').and.returnValue(
        JSON.stringify({ llm: 'openai' }),
      );
      spyOn(window, 'alert');

      component.openLlmDialog();

      expect(window.alert).not.toHaveBeenCalled();
      expect(mockLlmDialogService.openDialog).toHaveBeenCalled();
    });
  });

  describe('getScreenSize', () => {
    it('should hide sidebar when window width is less than 768', () => {
      component.showSidebar = true;
      spyOnProperty(window, 'innerWidth').and.returnValue(500);

      component.getScreenSize();

      expect(component.showSidebar).toBe(false);
    });

    it('should not change sidebar when window width is 768 or more', () => {
      component.showSidebar = true;
      spyOnProperty(window, 'innerWidth').and.returnValue(1024);

      component.getScreenSize();

      expect(component.showSidebar).toBe(true);
    });
  });

  describe('vimConfig', () => {
    it('should copy base64 encoded config to clipboard', () => {
      component.vimConfig();
      expect(mockClipboard.copy).toHaveBeenCalled();

      // Verify the argument is a base64 string
      const copiedValue = mockClipboard.copy.calls.mostRecent().args[0];
      expect(typeof copiedValue).toBe('string');

      // Decode and verify it contains expected keys
      const decoded = JSON.parse(atob(copiedValue));
      expect(decoded).toHaveProperty('apiUrl');
      expect(decoded).toHaveProperty('region');
      expect(decoded).toHaveProperty('domain');
      expect(decoded).toHaveProperty('clientId');
    });
  });

  describe('drop', () => {
    it('should delegate to documentTree.dropNode', () => {
      const mockEvent = {} as any;
      component.drop(mockEvent);
      expect(mockDocumentTree.dropNode).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe('addNewItem', () => {
    it('should set showSidebar to true and delegate to documentTree', () => {
      const node: DocumentFlatNode = {
        id: 'test',
        name: 'test',
        parent: ROOT_ID,
        deleted: false,
        pinned: false,
        editNode: false,
        level: 1,
        expandable: true,
      };

      // Mock getElementById for focus call
      const mockElement = { focus: jasmine.createSpy('focus') };
      spyOn(document, 'getElementById').and.returnValue(
        mockElement as unknown as HTMLElement,
      );

      component.showSidebar = false;
      component.addNewItem(node);

      expect(component.showSidebar).toBe(true);
      expect(mockDocumentTree.addNewItem).toHaveBeenCalledWith(node);
    });
  });

  describe('ngOnInit', () => {
    it('should set username from localStorage', () => {
      spyOn(localStorage, 'getItem').and.returnValue('testuser');
      component.ngOnInit();
      expect(component.username).toBe('testuser');
    });

    it('should detect mobile device', () => {
      spyOnProperty(navigator, 'userAgent').and.returnValue(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)',
      );
      component.ngOnInit();
      expect(component.isMobileDevice).toBe(true);
    });

    it('should detect non-mobile device', () => {
      spyOnProperty(navigator, 'userAgent').and.returnValue(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      );
      component.ngOnInit();
      expect(component.isMobileDevice).toBe(false);
    });
  });
});
