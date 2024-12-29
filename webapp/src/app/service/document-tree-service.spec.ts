import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import {
  DocumentTree,
  ROOT_ID,
  PINNED_ID,
  TRASH_ID,
  DocumentNode,
  DocumentFlatNode,
} from './document-tree-service';
import { BasicRestService } from './basic-rest.service';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Auth } from 'aws-amplify';

class MockBasicRestService {
  get(url: string) {
    return of({
      content: 'mock content',
      title: 'mock title',
      isPublic: true,
    });
  }

  post(url: string, body: any) {
    return of({});
  }
}

describe('DocumentTree', () => {
  let service: DocumentTree;
  let httpMock: HttpTestingController;
  let basicRestService: MockBasicRestService;

  const mockActivatedRoute = {
    paramMap: of({
      get: (key: string) => null,
    }),
  };

  const mockDocumentTreeResponse = {
    documents: [
      {
        id: 'doc1',
        name: 'Document 1',
        parent: ROOT_ID,
        children: [],
        deleted: false,
        pinned: false,
      },
    ],
    pinned: [
      {
        id: 'pin1',
        name: 'Pinned 1',
        parent: PINNED_ID,
        children: [],
        deleted: false,
        pinned: true,
      },
    ],
    trash: [
      {
        id: 'trash1',
        name: 'Trash 1',
        parent: TRASH_ID,
        children: [],
        deleted: true,
        pinned: false,
      },
    ],
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        DocumentTree,
        { provide: BasicRestService, useClass: MockBasicRestService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    });

    service = TestBed.inject(DocumentTree);
    httpMock = TestBed.inject(HttpTestingController);
    basicRestService = TestBed.inject(
      BasicRestService,
    ) as unknown as MockBasicRestService;

    environment.production = true;
    spyOn(Auth, 'currentAuthenticatedUser').and.returnValue(
      Promise.resolve({ username: 'testuser' }),
    );

    await service.initialize();

    const req = httpMock.expectOne(
      `${service.backend_url}/documentTree/testuser`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockDocumentTreeResponse);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize document tree in production environment', async () => {
    expect(service.rootNode).toEqual(<DocumentNode>{
      id: ROOT_ID,
      name: ROOT_ID,
      children: mockDocumentTreeResponse.documents,
    });
    expect(service.pinnedNode).toEqual(<DocumentNode>{
      id: PINNED_ID,
      name: PINNED_ID,
      children: mockDocumentTreeResponse.pinned,
    });
    expect(service.trashNode).toEqual(<DocumentNode>{
      id: TRASH_ID,
      name: TRASH_ID,
      children: mockDocumentTreeResponse.trash,
    });
  });

  // it('should initialize document tree in non-production environment', async () => {
  //   environment.production = false;
  //
  //   await service.initialize();
  //
  //   const req = httpMock.expectOne(
  //     `${service.backend_url}/documentTree/4afe1f16-add0-11ed-afa1-0242ac120002`,
  //   );
  //   expect(req.request.method).toBe('GET');
  //   req.flush(mockDocumentTreeResponse);
  //
  //   expect(service.rootNode).toEqual(<DocumentNode>{
  //     id: ROOT_ID,
  //     name: ROOT_ID,
  //     children: mockDocumentTreeResponse.documents,
  //   });
  //   expect(service.pinnedNode).toEqual(<DocumentNode>{
  //     id: PINNED_ID,
  //     name: PINNED_ID,
  //     children: mockDocumentTreeResponse.pinned,
  //   });
  //   expect(service.trashNode).toEqual(<DocumentNode>{
  //     id: TRASH_ID,
  //     name: TRASH_ID,
  //     children: mockDocumentTreeResponse.trash,
  //   });
  // });

  it('should add a new item to root node and delete the newly created item', async () => {
    expect(service.rootNode!.children!.length).toBe(1);
    expect(service.rootNode!.children![0].name).toBe('Document 1');

    const parentNode = new DocumentFlatNode();
    parentNode.id = ROOT_ID;

    service.addNewItem(parentNode);

    expect(service.rootNode!.children!.length).toBe(2);
    expect(service.rootNode!.children![0].name).toBe('');
    expect(service.rootNode!.children![1].name).toBe('Document 1');

    const nodeToDelete = new DocumentFlatNode();
    nodeToDelete.id = service.rootNode!.children![0].id;
    nodeToDelete.parent = ROOT_ID;

    service.deleteEmptyItem(nodeToDelete);

    expect(service.rootNode!.children!.length).toBe(1);
    expect(service.rootNode!.children![0].name).toBe('Document 1');
  });

  // it('should delete an empty item', () => {
  //   const node = new DocumentFlatNode();
  //   node.id = 'doc1';
  //   node.parent = ROOT_ID;
  //
  //   service.addNewItem(node);
  //
  //   expect(service.rootNode!.children!.length).toBe(1);
  //
  //   service.deleteEmptyItem(node);
  //
  //   expect(service.rootNode.children).toEqual(null);
  // });

  // it('should move a node to trash', () => {
  //   const node = new DocumentFlatNode();
  //   node.id = 'doc1';
  //   node.parent = ROOT_ID;
  //
  //   service.rootNode = {
  //     id: ROOT_ID,
  //     name: ROOT_ID,
  //     children: [
  //       {
  //         id: 'doc1',
  //         name: 'Document 1',
  //         parent: ROOT_ID,
  //         children: [],
  //         deleted: false,
  //         pinned: false,
  //       },
  //     ],
  //   };
  //
  //   service.moveToTrash(node);
  //
  //   expect(service.trashNode.children.length).toBe(1);
  //   expect(service.trashNode.children[0].id).toBe('doc1');
  // });

  // it('should pin a node', () => {
  //   const node = new DocumentFlatNode();
  //   node.id = 'doc1';
  //   node.parent = ROOT_ID;
  //
  //   service.rootNode = {
  //     id: ROOT_ID,
  //     name: ROOT_ID,
  //     children: [
  //       {
  //         id: 'doc1',
  //         name: 'Document 1',
  //         parent: ROOT_ID,
  //         children: [],
  //         deleted: false,
  //         pinned: false,
  //       },
  //     ],
  //   };
  //
  //   service.pinItem(node);
  //
  //   expect(service.pinnedNode.children.length).toBe(1);
  //   expect(service.pinnedNode.children[0].id).toBe('doc1');
  // });
});
