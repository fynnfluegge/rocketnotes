import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

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
  let mockBasicRestService: jasmine.SpyObj<BasicRestService>;

  const createMockNode = (overrides: Partial<DocumentFlatNode> = {}): DocumentFlatNode => {
    const node = new DocumentFlatNode();
    node.id = 'test-id';
    node.name = 'Test Node';
    node.parent = ROOT_ID;
    node.deleted = false;
    node.pinned = false;
    node.editNode = false;
    node.level = 0;
    node.expandable = false;
    Object.assign(node, overrides);
    return node;
  };

  // Create mock DocumentTree with all required properties
  const createMockDocumentTree = () => {
    const mock = jasmine.createSpyObj('DocumentTree', [
      'addNewItem',
      'refreshTree',
      'moveToTrash',
      'removeFromTrash',
      'restoreItem',
      'pinItem',
      'saveItem',
      'deleteEmptyItem',
      'expandNode',
      'isExpanded',
      'dropNode',
    ]);
    // Add required properties
    mock.initContentChange = { next: jasmine.createSpy('next') };
    mock.treeControl = {
      expand: jasmine.createSpy('expand'),
      collapse: jasmine.createSpy('collapse'),
      isExpanded: jasmine.createSpy('isExpanded').and.returnValue(false),
    };
    mock.dataSource = { data: [] };
    return mock;
  };

  let mockDocumentTree: ReturnType<typeof createMockDocumentTree>;

  beforeEach(async () => {
    mockDocumentTree = createMockDocumentTree();

    mockRouter = jasmine.createSpyObj('Router', ['navigate'], {
      url: '/documents',
    });

    mockLlmDialogService = jasmine.createSpyObj('LlmDialogService', [
      'openDialog',
      'closeDialog',
    ]);

    mockConfigDialogService = jasmine.createSpyObj('ConfigDialogService', [
      'openDialog',
      'closeDialog',
    ]);

    mockBasicRestService = jasmine.createSpyObj('BasicRestService', ['get', 'post', 'delete']);
    mockBasicRestService.get.and.returnValue(of({}) as any);
    mockBasicRestService.post.and.returnValue(of({}) as any);

    await TestBed.configureTestingModule({
      declarations: [SidenavComponent],
      imports: [HttpClientModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: BasicRestService, useValue: mockBasicRestService },
        { provide: Router, useValue: mockRouter },
        { provide: Clipboard, useValue: jasmine.createSpyObj('Clipboard', ['copy']) },
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
    })
      .overrideComponent(SidenavComponent, {
        set: {
          providers: [
            { provide: DocumentTree, useValue: mockDocumentTree },
            { provide: LlmDialogService, useValue: mockLlmDialogService },
            { provide: ConfigDialogService, useValue: mockConfigDialogService },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SidenavComponent);
    component = fixture.componentInstance;

    // Mock the searchInput ViewChild
    component.searchInput = {
      nativeElement: { value: '', focus: jasmine.createSpy('focus') },
    } as any;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Node Type Detection Methods', () => {
    it('isRoot should return true when node id is ROOT_ID', () => {
      const node = createMockNode({ id: ROOT_ID });
      expect(component.isRoot(0, node)).toBeTrue();
    });

    it('isRoot should return false when node id is not ROOT_ID', () => {
      const node = createMockNode({ id: 'other-id' });
      expect(component.isRoot(0, node)).toBeFalse();
    });

    it('isTrash should return true when node id is TRASH_ID', () => {
      const node = createMockNode({ id: TRASH_ID });
      expect(component.isTrash(0, node)).toBeTrue();
    });

    it('isTrash should return false when node id is not TRASH_ID', () => {
      const node = createMockNode({ id: 'other-id' });
      expect(component.isTrash(0, node)).toBeFalse();
    });

    it('isPinned should return true when node id is PINNED_ID', () => {
      const node = createMockNode({ id: PINNED_ID });
      expect(component.isPinned(0, node)).toBeTrue();
    });

    it('isPinned should return false when node id is not PINNED_ID', () => {
      const node = createMockNode({ id: 'other-id' });
      expect(component.isPinned(0, node)).toBeFalse();
    });

    it('editNode should return true when node.editNode is true', () => {
      const node = createMockNode({ editNode: true });
      expect(component.editNode(0, node)).toBeTrue();
    });

    it('editNode should return false when node.editNode is false', () => {
      const node = createMockNode({ editNode: false });
      expect(component.editNode(0, node)).toBeFalse();
    });

    it('hasChild should return true when node is expandable', () => {
      const node = createMockNode({ expandable: true });
      expect(component.hasChild(0, node)).toBeTrue();
    });

    it('hasChild should return false when node is not expandable', () => {
      const node = createMockNode({ expandable: false });
      expect(component.hasChild(0, node)).toBeFalse();
    });

    it('hasNoContent should return true when node name is empty', () => {
      const node = createMockNode({ name: '' });
      expect(component.hasNoContent(0, node)).toBeTrue();
    });

    it('hasNoContent should return false when node name is not empty', () => {
      const node = createMockNode({ name: 'Some Name' });
      expect(component.hasNoContent(0, node)).toBeFalse();
    });
  });

  describe('Operating System Detection', () => {
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

    it('should detect iOS', () => {
      spyOnProperty(navigator, 'userAgent').and.returnValue(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)',
      );
      component.setOperatingSystem();
      expect(component.operatingSystem).toBe('iOS');
    });
  });

  describe('Command Key Display', () => {
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

  describe('Menu Toggle', () => {
    it('should toggle showSidebar from true to false', () => {
      component.showSidebar = true;
      component.onMenuToggle();
      expect(component.showSidebar).toBeFalse();
    });

    it('should toggle showSidebar from false to true', () => {
      component.showSidebar = false;
      component.onMenuToggle();
      expect(component.showSidebar).toBeTrue();
    });
  });

  describe('Dark Mode Toggle', () => {
    beforeEach(() => {
      spyOn(localStorage, 'setItem');
      // Mock document.documentElement.style.setProperty
      spyOn(document.documentElement.style, 'setProperty');
    });

    it('should toggle darkmode from false to true', () => {
      component.darkmode = false;
      component.toggleDarkMode();
      expect(component.darkmode).toBeTrue();
    });

    it('should toggle darkmode from true to false', () => {
      component.darkmode = true;
      component.toggleDarkMode();
      expect(component.darkmode).toBeFalse();
    });

    it('should store darkmode in localStorage', () => {
      component.darkmode = false;
      component.toggleDarkMode();
      expect(localStorage.setItem).toHaveBeenCalledWith('darkmode', 'true');
    });

    it('should call setTheme after toggling', () => {
      component.darkmode = false;
      component.toggleDarkMode();
      expect(document.documentElement.style.setProperty).toHaveBeenCalled();
    });
  });

  describe('Screen Size Detection', () => {
    it('should hide sidebar when width < 768', () => {
      spyOnProperty(window, 'innerWidth').and.returnValue(767);
      component.showSidebar = true;
      component.getScreenSize();
      expect(component.showSidebar).toBeFalse();
    });

    it('should not change sidebar when width >= 768', () => {
      spyOnProperty(window, 'innerWidth').and.returnValue(768);
      component.showSidebar = true;
      component.getScreenSize();
      expect(component.showSidebar).toBeTrue();
    });
  });

  describe('Zettelkasten Navigation', () => {
    it('should set showZettelkasten to true', () => {
      component.showZettelkasten = false;
      component.openZettelkasten();
      expect(component.showZettelkasten).toBeTrue();
    });

    it('should navigate to /notebox', () => {
      component.openZettelkasten();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/notebox']);
    });
  });

  describe('Drag & Drop State Management', () => {
    it('dragStart should set dragging to true', () => {
      component.dragging = false;
      component.dragStart();
      expect(component.dragging).toBeTrue();
    });

    it('dragEnd should set dragging to false', () => {
      component.dragging = true;
      component.dragEnd();
      expect(component.dragging).toBeFalse();
    });

    it('dragHover should set expand timeout when dragging', fakeAsync(() => {
      const node = createMockNode();
      component.dragging = true;
      component.expandDelay = 100;

      component.dragHover(node);
      tick(150);
      flush();

      expect(mockDocumentTree.expandNode).toHaveBeenCalledWith(node);
    }));

    it('dragHover should not set expand timeout when not dragging', fakeAsync(() => {
      const node = createMockNode();
      component.dragging = false;
      component.expandDelay = 100;

      component.dragHover(node);
      tick(150);
      flush();

      expect(mockDocumentTree.expandNode).not.toHaveBeenCalled();
    }));

    it('dragHoverEnd should clear expand timeout when dragging', () => {
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
  });

  describe('Item Management Delegation', () => {
    it('addNewItem should call documentTree.addNewItem and set showSidebar to true', () => {
      const node = createMockNode();
      const mockElement = document.createElement('input');
      mockElement.id = 'new_document';
      document.body.appendChild(mockElement);
      spyOn(mockElement, 'focus');

      component.showSidebar = false;
      component.addNewItem(node);

      expect(component.showSidebar).toBeTrue();
      expect(mockDocumentTree.addNewItem).toHaveBeenCalledWith(node);

      document.body.removeChild(mockElement);
    });

    it('editItem should set editNode to true and refresh tree', () => {
      const node = createMockNode({ editNode: false });
      const mockElement = document.createElement('input');
      mockElement.id = 'edit_document_title';
      document.body.appendChild(mockElement);
      spyOn(mockElement, 'focus');

      component.editItem(node);

      expect(node.editNode).toBeTrue();
      expect(mockDocumentTree.refreshTree).toHaveBeenCalled();

      document.body.removeChild(mockElement);
    });

    it('cancelEditItem should set editNode to false and refresh tree', () => {
      const node = createMockNode({ editNode: true });

      component.cancelEditItem(node);

      expect(node.editNode).toBeFalse();
      expect(mockDocumentTree.refreshTree).toHaveBeenCalled();
    });

    it('moveToTrash should call documentTree.moveToTrash', () => {
      const node = createMockNode();

      component.moveToTrash(node);

      expect(mockDocumentTree.moveToTrash).toHaveBeenCalledWith(node);
    });

    it('restoreItem should call documentTree.restoreItem', () => {
      const node = createMockNode();

      component.restoreItem(node);

      expect(mockDocumentTree.restoreItem).toHaveBeenCalledWith(node);
    });

    it('pinItem should call documentTree.pinItem', () => {
      const node = createMockNode();

      component.pinItem(node);

      expect(mockDocumentTree.pinItem).toHaveBeenCalledWith(node);
    });

    it('saveItem should call documentTree.saveItem', () => {
      const node = createMockNode();

      component.saveItem(node, 'New Name', true);

      expect(mockDocumentTree.saveItem).toHaveBeenCalledWith(node, 'New Name', true);
    });

    it('deleteEmptyItem should call documentTree.deleteEmptyItem', () => {
      const node = createMockNode();

      component.deleteEmptyItem(node);

      expect(mockDocumentTree.deleteEmptyItem).toHaveBeenCalledWith(node);
    });

    it('isExpanded should call documentTree.isExpanded', () => {
      const node = createMockNode();
      mockDocumentTree.isExpanded.and.returnValue(true);

      const result = component.isExpanded(node);

      expect(mockDocumentTree.isExpanded).toHaveBeenCalledWith(node);
      expect(result).toBeTrue();
    });

    it('drop should call documentTree.dropNode', () => {
      const mockEvent = { item: { data: createMockNode() } } as any;

      component.drop(mockEvent);

      expect(mockDocumentTree.dropNode).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe('LLM Dialog', () => {
    let localStorageGetItemSpy: jasmine.Spy;

    beforeEach(() => {
      spyOn(window, 'alert');
      localStorageGetItemSpy = spyOn(localStorage, 'getItem');
    });

    it('should show alert when config is null', () => {
      localStorageGetItemSpy.and.returnValue(null);

      component.openLlmDialog();

      expect(window.alert).toHaveBeenCalledWith(
        'Please configure your LLM settings first. Click on the LLM config button in the user menu popup.',
      );
      expect(mockLlmDialogService.openDialog).not.toHaveBeenCalled();
    });

    it('should show alert when config has empty llm setting', () => {
      localStorageGetItemSpy.and.returnValue(JSON.stringify({ llm: '' }));

      component.openLlmDialog();

      expect(window.alert).toHaveBeenCalled();
      expect(mockLlmDialogService.openDialog).not.toHaveBeenCalled();
    });

    it('should open dialog when config has valid llm setting', () => {
      localStorageGetItemSpy.and.returnValue(JSON.stringify({ llm: 'gpt-4' }));

      component.openLlmDialog();

      expect(window.alert).not.toHaveBeenCalled();
      expect(mockLlmDialogService.openDialog).toHaveBeenCalled();
    });
  });

  describe('Config Dialog', () => {
    it('should open config dialog', () => {
      component.openConfigDialog();

      expect(mockConfigDialogService.openDialog).toHaveBeenCalled();
    });
  });

  describe('Constructor Behavior', () => {
    it('should set showZettelkasten to true when url is /notebox', async () => {
      const routerWithNotebox = jasmine.createSpyObj('Router', ['navigate'], {
        url: '/notebox',
      });
      const newMockDocumentTree = createMockDocumentTree();

      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        declarations: [SidenavComponent],
        imports: [HttpClientModule],
        schemas: [NO_ERRORS_SCHEMA],
        providers: [
          { provide: BasicRestService, useValue: mockBasicRestService },
          { provide: Router, useValue: routerWithNotebox },
          { provide: Clipboard, useValue: jasmine.createSpyObj('Clipboard', ['copy']) },
          {
            provide: ActivatedRoute,
            useValue: {
              params: of({ id: '123' }),
              paramMap: of({ get: () => '123' }),
            },
          },
        ],
      })
        .overrideComponent(SidenavComponent, {
          set: {
            providers: [
              { provide: DocumentTree, useValue: newMockDocumentTree },
              { provide: LlmDialogService, useValue: mockLlmDialogService },
              { provide: ConfigDialogService, useValue: mockConfigDialogService },
            ],
          },
        })
        .compileComponents();

      const newFixture = TestBed.createComponent(SidenavComponent);
      const newComponent = newFixture.componentInstance;

      expect(newComponent.showZettelkasten).toBeTrue();
    });

    it('should set showZettelkasten to false when url is not /notebox', () => {
      // The default mockRouter has url: '/documents'
      expect(component.showZettelkasten).toBeFalse();
    });
  });

  describe('removeFromTrash', () => {
    it('should call documentTree.removeFromTrash when user confirms', () => {
      const node = createMockNode({ name: 'Test Document' });
      spyOn(window, 'confirm').and.returnValue(true);

      component.removeFromTrash(node);

      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to permanently delete Test Document?',
      );
      expect(mockDocumentTree.removeFromTrash).toHaveBeenCalledWith(node);
    });

    it('should not call documentTree.removeFromTrash when user cancels', () => {
      const node = createMockNode({ name: 'Test Document' });
      spyOn(window, 'confirm').and.returnValue(false);

      component.removeFromTrash(node);

      expect(window.confirm).toHaveBeenCalled();
      expect(mockDocumentTree.removeFromTrash).not.toHaveBeenCalled();
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
    });

    it('should set border width to 1px in dark mode', () => {
      component.darkmode = true;
      component.setTheme();

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--border-width',
        '1px',
      );
    });

    it('should set border width to 2px in light mode', () => {
      component.darkmode = false;
      component.setTheme();

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--border-width',
        '2px',
      );
    });
  });

  describe('ngOnInit', () => {
    it('should set username from localStorage', () => {
      spyOn(localStorage, 'getItem').and.returnValue('testuser');

      component.ngOnInit();

      expect(component.username).toBe('testuser');
    });

    it('should detect mobile device from user agent', () => {
      spyOnProperty(navigator, 'userAgent').and.returnValue(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      );

      component.ngOnInit();

      expect(component.isMobileDevice).toBeTrue();
    });

    it('should not detect mobile device for desktop user agent', () => {
      spyOnProperty(navigator, 'userAgent').and.returnValue(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      );

      component.ngOnInit();

      expect(component.isMobileDevice).toBeFalse();
    });
  });
});
