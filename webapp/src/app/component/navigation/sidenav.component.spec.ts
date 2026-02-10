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
  let mockDocumentTree: jasmine.SpyObj<DocumentTree>;
  let mockLlmDialogService: jasmine.SpyObj<LlmDialogService>;
  let mockConfigDialogService: jasmine.SpyObj<ConfigDialogService>;
  let mockClipboard: jasmine.SpyObj<Clipboard>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate'], { url: '/home' });
    mockDocumentTree = jasmine.createSpyObj('DocumentTree', [
      'addNewItem',
      'refreshTree',
      'moveToTrash',
      'removeFromTrash',
      'saveItem',
      'restoreItem',
      'pinItem',
      'isExpanded',
      'expandNode',
      'dropNode',
      'deleteEmptyItem',
    ]);
    mockLlmDialogService = jasmine.createSpyObj('LlmDialogService', [
      'openDialog',
      'closeDialog',
    ]);
    mockConfigDialogService = jasmine.createSpyObj('ConfigDialogService', [
      'openDialog',
      'closeDialog',
    ]);
    mockClipboard = jasmine.createSpyObj('Clipboard', ['copy']);

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
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Operating System Detection', () => {
    it('should detect Windows OS', () => {
      spyOnProperty(navigator, 'userAgent').and.returnValue(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      );
      component.setOperatingSystem();
      expect(component.operatingSystem).toBe('Windows');
    });

    it('should detect Mac OS', () => {
      spyOnProperty(navigator, 'userAgent').and.returnValue(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      );
      component.setOperatingSystem();
      expect(component.operatingSystem).toBe('Mac');
    });

    it('should detect Linux OS', () => {
      spyOnProperty(navigator, 'userAgent').and.returnValue(
        'Mozilla/5.0 (X11; Linux x86_64)',
      );
      component.setOperatingSystem();
      expect(component.operatingSystem).toBe('Linux');
    });

    it('should detect Android OS', () => {
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

    it('should return empty string for unknown OS', () => {
      spyOnProperty(navigator, 'userAgent').and.returnValue('Unknown Browser');
      component.setOperatingSystem();
      expect(component.operatingSystem).toBe('');
    });
  });

  describe('Screen Size / Responsive', () => {
    it('should hide sidebar when screen width is less than 768px', () => {
      spyOnProperty(window, 'innerWidth').and.returnValue(500);
      component.showSidebar = true;
      component.getScreenSize();
      expect(component.showSidebar).toBe(false);
    });

    it('should not change sidebar visibility when screen width is 768px or more', () => {
      spyOnProperty(window, 'innerWidth').and.returnValue(1024);
      component.showSidebar = true;
      component.getScreenSize();
      expect(component.showSidebar).toBe(true);
    });
  });

  describe('Node Type Predicates', () => {
    it('isRoot should return true for ROOT_ID nodes', () => {
      const node = { id: ROOT_ID } as DocumentFlatNode;
      expect(component.isRoot(0, node)).toBe(true);
    });

    it('isRoot should return false for non-ROOT_ID nodes', () => {
      const node = { id: 'other-id' } as DocumentFlatNode;
      expect(component.isRoot(0, node)).toBe(false);
    });

    it('isTrash should return true for TRASH_ID nodes', () => {
      const node = { id: TRASH_ID } as DocumentFlatNode;
      expect(component.isTrash(0, node)).toBe(true);
    });

    it('isTrash should return false for non-TRASH_ID nodes', () => {
      const node = { id: 'other-id' } as DocumentFlatNode;
      expect(component.isTrash(0, node)).toBe(false);
    });

    it('isPinned should return true for PINNED_ID nodes', () => {
      const node = { id: PINNED_ID } as DocumentFlatNode;
      expect(component.isPinned(0, node)).toBe(true);
    });

    it('isPinned should return false for non-PINNED_ID nodes', () => {
      const node = { id: 'other-id' } as DocumentFlatNode;
      expect(component.isPinned(0, node)).toBe(false);
    });

    it('hasChild should return true for expandable nodes', () => {
      const node = { expandable: true } as DocumentFlatNode;
      expect(component.hasChild(0, node)).toBe(true);
    });

    it('hasChild should return false for non-expandable nodes', () => {
      const node = { expandable: false } as DocumentFlatNode;
      expect(component.hasChild(0, node)).toBe(false);
    });

    it('hasNoContent should return true for nodes with empty name', () => {
      const node = { name: '' } as DocumentFlatNode;
      expect(component.hasNoContent(0, node)).toBe(true);
    });

    it('hasNoContent should return false for nodes with content', () => {
      const node = { name: 'Test Document' } as DocumentFlatNode;
      expect(component.hasNoContent(0, node)).toBe(false);
    });

    it('editNode should return true when node.editNode is true', () => {
      const node = { editNode: true } as DocumentFlatNode;
      expect(component.editNode(0, node)).toBe(true);
    });

    it('editNode should return false when node.editNode is false', () => {
      const node = { editNode: false } as DocumentFlatNode;
      expect(component.editNode(0, node)).toBe(false);
    });
  });

  describe('Menu Toggle', () => {
    it('should toggle sidebar from true to false', () => {
      component.showSidebar = true;
      component.onMenuToggle();
      expect(component.showSidebar).toBe(false);
    });

    it('should toggle sidebar from false to true', () => {
      component.showSidebar = false;
      component.onMenuToggle();
      expect(component.showSidebar).toBe(true);
    });
  });

  describe('Dark Mode', () => {
    let setPropertySpy: jasmine.Spy;

    beforeEach(() => {
      setPropertySpy = spyOn(
        document.documentElement.style,
        'setProperty',
      ).and.callThrough();
      spyOn(localStorage, 'setItem');
    });

    it('should toggle darkmode from false to true', () => {
      component.darkmode = false;
      component.toggleDarkMode();
      expect(component.darkmode).toBe(true);
    });

    it('should toggle darkmode from true to false', () => {
      component.darkmode = true;
      component.toggleDarkMode();
      expect(component.darkmode).toBe(false);
    });

    it('should save darkmode to localStorage on toggle', () => {
      component.darkmode = false;
      component.toggleDarkMode();
      expect(localStorage.setItem).toHaveBeenCalledWith('darkmode', 'true');
    });

    it('should set dark theme CSS variables when darkmode is true', () => {
      component.darkmode = true;
      component.setTheme();
      expect(setPropertySpy).toHaveBeenCalledWith(
        '--background-color',
        'var(--dark-theme-background-color)',
      );
      expect(setPropertySpy).toHaveBeenCalledWith(
        '--font-color',
        'var(--dark-theme-font-color)',
      );
      expect(setPropertySpy).toHaveBeenCalledWith(
        '--menu-color',
        'var(--dark-theme-menu-color)',
      );
    });

    it('should set light theme CSS variables when darkmode is false', () => {
      component.darkmode = false;
      component.setTheme();
      expect(setPropertySpy).toHaveBeenCalledWith(
        '--background-color',
        'var(--light-theme-background-color)',
      );
      expect(setPropertySpy).toHaveBeenCalledWith(
        '--font-color',
        'var(--light-theme-font-color)',
      );
      expect(setPropertySpy).toHaveBeenCalledWith(
        '--menu-color',
        'var(--light-theme-menu-color)',
      );
    });

    it('should set border-width to 1px for dark mode', () => {
      component.darkmode = true;
      component.setTheme();
      expect(setPropertySpy).toHaveBeenCalledWith('--border-width', '1px');
    });

    it('should set border-width to 2px for light mode', () => {
      component.darkmode = false;
      component.setTheme();
      expect(setPropertySpy).toHaveBeenCalledWith('--border-width', '2px');
    });
  });

  describe('Command Key', () => {
    it('should return ⌘ for Mac OS', () => {
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

    it('should return Ctrl for unknown OS', () => {
      component.operatingSystem = '';
      expect(component.commandKey()).toBe('Ctrl');
    });
  });

  describe('Document Operations', () => {
    it('editItem should set editNode to true and call refreshTree', () => {
      const node = { editNode: false } as DocumentFlatNode;

      // Create a mock element for focus
      const mockElement = document.createElement('input');
      mockElement.id = 'edit_document_title';
      document.body.appendChild(mockElement);
      spyOn(mockElement, 'focus');

      component.editItem(node);

      expect(node.editNode).toBe(true);
      expect(mockDocumentTree.refreshTree).toHaveBeenCalled();

      document.body.removeChild(mockElement);
    });

    it('cancelEditItem should set editNode to false and call refreshTree', () => {
      const node = { editNode: true } as DocumentFlatNode;
      component.cancelEditItem(node);
      expect(node.editNode).toBe(false);
      expect(mockDocumentTree.refreshTree).toHaveBeenCalled();
    });

    it('addNewItem should set showSidebar to true and call documentTree.addNewItem', () => {
      const node = { id: 'test-id' } as DocumentFlatNode;
      component.showSidebar = false;

      // Create a mock element for focus
      const mockElement = document.createElement('input');
      mockElement.id = 'new_document';
      document.body.appendChild(mockElement);

      component.addNewItem(node);

      expect(component.showSidebar).toBe(true);
      expect(mockDocumentTree.addNewItem).toHaveBeenCalledWith(node);

      document.body.removeChild(mockElement);
    });

    it('deleteEmptyItem should call documentTree.deleteEmptyItem', () => {
      const node = { id: 'test-id' } as DocumentFlatNode;
      component.deleteEmptyItem(node);
      expect(mockDocumentTree.deleteEmptyItem).toHaveBeenCalledWith(node);
    });

    it('moveToTrash should call documentTree.moveToTrash', () => {
      const node = { id: 'test-id' } as DocumentFlatNode;
      component.moveToTrash(node);
      expect(mockDocumentTree.moveToTrash).toHaveBeenCalledWith(node);
    });

    it('saveItem should call documentTree.saveItem', () => {
      const node = { id: 'test-id' } as DocumentFlatNode;
      component.saveItem(node, 'New Title', true);
      expect(mockDocumentTree.saveItem).toHaveBeenCalledWith(
        node,
        'New Title',
        true,
      );
    });

    it('restoreItem should call documentTree.restoreItem', () => {
      const node = { id: 'test-id' } as DocumentFlatNode;
      component.restoreItem(node);
      expect(mockDocumentTree.restoreItem).toHaveBeenCalledWith(node);
    });

    it('pinItem should call documentTree.pinItem', () => {
      const node = { id: 'test-id' } as DocumentFlatNode;
      component.pinItem(node);
      expect(mockDocumentTree.pinItem).toHaveBeenCalledWith(node);
    });

    it('isExpanded should call documentTree.isExpanded', () => {
      const node = { id: 'test-id' } as DocumentFlatNode;
      mockDocumentTree.isExpanded.and.returnValue(true);
      const result = component.isExpanded(node);
      expect(mockDocumentTree.isExpanded).toHaveBeenCalledWith(node);
      expect(result).toBe(true);
    });

    it('removeFromTrash should call documentTree.removeFromTrash when confirmed', () => {
      const node = { id: 'test-id', name: 'Test Doc' } as DocumentFlatNode;
      spyOn(window, 'confirm').and.returnValue(true);
      component.removeFromTrash(node);
      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to permanently delete Test Doc?',
      );
      expect(mockDocumentTree.removeFromTrash).toHaveBeenCalledWith(node);
    });

    it('removeFromTrash should not call documentTree.removeFromTrash when not confirmed', () => {
      const node = { id: 'test-id', name: 'Test Doc' } as DocumentFlatNode;
      spyOn(window, 'confirm').and.returnValue(false);
      component.removeFromTrash(node);
      expect(mockDocumentTree.removeFromTrash).not.toHaveBeenCalled();
    });
  });

  describe('Drag and Drop', () => {
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

    it('dragHoverEnd should clear expandTimeout when dragging', () => {
      component.dragging = true;
      component.expandTimeout = setTimeout(() => {}, 1000);
      spyOn(window, 'clearTimeout');
      component.dragHoverEnd();
      expect(window.clearTimeout).toHaveBeenCalled();
    });

    it('dragHoverEnd should not clear timeout when not dragging', () => {
      component.dragging = false;
      spyOn(window, 'clearTimeout');
      component.dragHoverEnd();
      expect(window.clearTimeout).not.toHaveBeenCalled();
    });

    it('dragHover should set timeout to expand node when dragging', () => {
      jasmine.clock().install();
      component.dragging = true;
      const node = { id: 'test-id' } as DocumentFlatNode;

      component.dragHover(node);

      jasmine.clock().tick(component.expandDelay + 1);

      expect(mockDocumentTree.expandNode).toHaveBeenCalledWith(node);
      jasmine.clock().uninstall();
    });

    it('dragHover should not set timeout when not dragging', () => {
      component.dragging = false;
      const node = { id: 'test-id' } as DocumentFlatNode;
      component.dragHover(node);
      expect(component.expandTimeout).toBeUndefined();
    });

    it('drop should call documentTree.dropNode', () => {
      const event = {
        item: { data: {} },
        currentIndex: 0,
      } as any;
      component.drop(event);
      expect(mockDocumentTree.dropNode).toHaveBeenCalledWith(event);
    });
  });

  describe('Navigation', () => {
    it('openZettelkasten should set showZettelkasten to true and navigate', () => {
      component.showZettelkasten = false;
      component.openZettelkasten();
      expect(component.showZettelkasten).toBe(true);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/notebox']);
    });
  });

  describe('LLM Dialog', () => {
    it('should show alert when no config is set', () => {
      spyOn(localStorage, 'getItem').and.returnValue(null);
      spyOn(window, 'alert');
      component.openLlmDialog();
      expect(window.alert).toHaveBeenCalledWith(
        'Please configure your LLM settings first. Click on the LLM config button in the user menu popup.',
      );
      expect(mockLlmDialogService.openDialog).not.toHaveBeenCalled();
    });

    it('should show alert when config has empty llm', () => {
      spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify({ llm: '' }));
      spyOn(window, 'alert');
      component.openLlmDialog();
      expect(window.alert).toHaveBeenCalled();
      expect(mockLlmDialogService.openDialog).not.toHaveBeenCalled();
    });

    it('should open dialog when config is properly set', () => {
      spyOn(localStorage, 'getItem').and.returnValue(
        JSON.stringify({ llm: 'openai' }),
      );
      component.openLlmDialog();
      expect(mockLlmDialogService.openDialog).toHaveBeenCalled();
    });
  });

  describe('Config Dialog', () => {
    it('should call configDialogService.openDialog', () => {
      component.openConfigDialog();
      expect(mockConfigDialogService.openDialog).toHaveBeenCalled();
    });
  });

  describe('ngOnInit', () => {
    it('should load username from localStorage', () => {
      spyOn(localStorage, 'getItem').and.returnValue('testuser');
      component.ngOnInit();
      expect(localStorage.getItem).toHaveBeenCalledWith('username');
      expect(component.username).toBe('testuser');
    });

    it('should detect mobile device from user agent', () => {
      spyOnProperty(navigator, 'userAgent').and.returnValue(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)',
      );
      spyOn(localStorage, 'getItem').and.returnValue('testuser');
      component.ngOnInit();
      expect(component.isMobileDevice).toBe(true);
    });

    it('should not detect mobile device for desktop user agent', () => {
      spyOnProperty(navigator, 'userAgent').and.returnValue(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      );
      spyOn(localStorage, 'getItem').and.returnValue('testuser');
      component.ngOnInit();
      expect(component.isMobileDevice).toBe(false);
    });
  });

  describe('Zettelkasten Route Detection', () => {
    it('should set showZettelkasten to true when URL is /notebox', async () => {
      // Create a new component with notebox route
      const noteboxRouter = jasmine.createSpyObj('Router', ['navigate'], {
        url: '/notebox',
      });

      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        declarations: [SidenavComponent],
        imports: [HttpClientModule],
        providers: [
          BasicRestService,
          { provide: DocumentTree, useValue: mockDocumentTree },
          { provide: Router, useValue: noteboxRouter },
          { provide: LlmDialogService, useValue: mockLlmDialogService },
          { provide: ConfigDialogService, useValue: mockConfigDialogService },
          { provide: Clipboard, useValue: mockClipboard },
          {
            provide: ActivatedRoute,
            useValue: {
              params: of({ id: '123' }),
              paramMap: of({ get: () => '123' }),
            },
          },
        ],
      }).compileComponents();

      const noteboxFixture = TestBed.createComponent(SidenavComponent);
      const noteboxComponent = noteboxFixture.componentInstance;

      expect(noteboxComponent.showZettelkasten).toBe(true);
    });

    it('should set showZettelkasten to false when URL is not /notebox', () => {
      expect(component.showZettelkasten).toBe(false);
    });
  });

  describe('Vim Config', () => {
    it('should copy base64 encoded config to clipboard', () => {
      component.vimConfig();
      expect(mockClipboard.copy).toHaveBeenCalled();
      const copiedValue = mockClipboard.copy.calls.mostRecent().args[0];
      // Verify it's a base64 string
      expect(() => atob(copiedValue)).not.toThrow();
    });
  });
});
