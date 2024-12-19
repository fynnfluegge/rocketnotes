import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Auth } from 'aws-amplify';
import { BehaviorSubject, Observable, Subject, of as ofObservable } from 'rxjs';
import { FlatTreeControl } from '@angular/cdk/tree';
import {
  MatTreeFlatDataSource,
  MatTreeFlattener,
} from '@angular/material/tree';
import { environment } from 'src/environments/environment';
import * as uuid from 'uuid';
import { BasicRestService } from './basic-rest.service';

export const ROOT_ID: string = 'root';
export const PINNED_ID: string = 'pinned';
export const TRASH_ID: string = 'trash';

/**
 * Document node for hierarchical representation
 */
export class DocumentNode {
  id: string;
  name: string;
  parent: string;
  children?: DocumentNode[];
  deleted: boolean;
  pinned: boolean;
}

/**
 * Document node for flat representation
 */
export class DocumentFlatNode {
  id: string;
  name: string;
  parent: string;
  deleted: boolean;
  pinned: boolean;
  editNode: boolean;
  level: number;
  expandable: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DocumentTree {
  backend_url = environment.apiUrl;
  rootNode: DocumentNode;
  trashNode: DocumentNode;
  pinnedNode: DocumentNode;

  rootNodeMap: Map<string, DocumentNode> = new Map();
  pinnedNodeMap: Map<string, DocumentNode> = new Map();

  dataChange: BehaviorSubject<DocumentNode[]> = new BehaviorSubject<
    DocumentNode[]
  >([]);

  initContentChange: Subject<any> = new Subject<any>();

  /** Map from flat node to nested node. This helps us finding the nested node to be modified */
  flatNodeMap: Map<DocumentFlatNode, DocumentNode> = new Map<
    DocumentFlatNode,
    DocumentNode
  >();

  /** Map from nested node to flattened node. This helps us to keep the same object for selection */
  nestedNodeMap: Map<DocumentNode, DocumentFlatNode> = new Map<
    DocumentNode,
    DocumentFlatNode
  >();

  /** A selected parent node to be inserted */
  selectedParent: DocumentFlatNode | null = null;

  treeControl: FlatTreeControl<DocumentFlatNode>;

  treeFlattener: MatTreeFlattener<DocumentNode, DocumentFlatNode>;

  dataSource: MatTreeFlatDataSource<DocumentNode, DocumentFlatNode>;

  get data(): DocumentNode[] {
    return this.dataChange.value;
  }

  constructor(
    public http: HttpClient,
    private basicRestService: BasicRestService,
    private route: ActivatedRoute,
  ) {
    this.treeFlattener = new MatTreeFlattener(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren,
    );
    this.treeControl = new FlatTreeControl<DocumentFlatNode>(
      this.getLevel,
      this.isExpandable,
    );
    this.dataSource = new MatTreeFlatDataSource(
      this.treeControl,
      this.treeFlattener,
    );

    this.dataChange.subscribe((data) => {
      this.dataSource.data = data;

      this.treeControl.collapse(
        this.nestedNodeMap.get(this.documentTree.rootNode),
      );
      this.treeControl.expand(
        this.nestedNodeMap.get(this.documentTree.rootNode),
      );
    });
    this.initialize();
  }

  initialize() {
    // since localStorage.getItem("currentUserId") may not yet be initialized Auth.currentAuthenticatedUser() is used
    if (environment.production) {
      Auth.currentAuthenticatedUser().then((user) => {
        this.http
          .get(this.backend_url + '/documentTree/' + user.username)
          .subscribe({
            next: (res) => {
              const jsonObject = JSON.parse(JSON.stringify(res));
              this.rootNode = <DocumentNode>{
                id: ROOT_ID,
                name: ROOT_ID,
                children: jsonObject.documents,
              };
              this.pinnedNode = <DocumentNode>{
                id: PINNED_ID,
                name: PINNED_ID,
                children: jsonObject.pinned,
              };
              this.trashNode = <DocumentNode>{
                id: TRASH_ID,
                name: TRASH_ID,
                children: jsonObject.trash,
              };

              if (jsonObject.trash) {
                jsonObject.trash.forEach((v) => {
                  this.setDeletedandUnpin(v);
                });
              }
              this.dataChange.next([
                this.pinnedNode,
                this.rootNode,
                this.trashNode,
              ]);

              this.rootNodeMap.set(this.rootNode.id, this.rootNode);
              this.rootNodeMap.set(this.trashNode.id, this.trashNode);

              if (jsonObject.documents) {
                jsonObject.documents.forEach((v) => {
                  this.rootNodeMap.set(v.id, v);
                  this.addFlatToMap(this.rootNodeMap, v);
                });
              }

              if (jsonObject.pinned) {
                jsonObject.pinned.forEach((v) => {
                  this.pinnedNodeMap.set(v.id, v);
                  this.addFlatToMap(this.pinnedNodeMap, v);
                });
              }

              if (jsonObject.trash) {
                jsonObject.trash.forEach((v) => {
                  this.rootNodeMap.set(v.id, v);
                  this.addFlatToMap(this.rootNodeMap, v);
                });
              }

              this.route.paramMap.subscribe((params) => {
                if (!params.get('id')) {
                  if (this.pinnedNode.children) {
                    this.basicRestService
                      .get('document/' + this.pinnedNode.children[0].id)
                      .subscribe((result) => {
                        const document = JSON.parse(JSON.stringify(result));
                        this.initContentChange.next({
                          id: document.id,
                          title: document.title,
                          content: document.content,
                          isPublic: document.isPublic,
                        });
                      });
                  } else if (this.rootNode.children) {
                    this.basicRestService
                      .get('document/' + this.rootNode.children[0].id)
                      .subscribe((result) => {
                        const document = JSON.parse(JSON.stringify(result));
                        this.initContentChange.next({
                          id: document.id,
                          title: document.title,
                          content: document.content,
                          isPublic: document.isPublic,
                        });
                      });
                  }
                }
              });
            },
          });
      });
    } else {
      this.basicRestService
        .get('documentTree/4afe1f16-add0-11ed-afa1-0242ac120002')
        .subscribe({
          next: (res) => {
            const jsonObject = JSON.parse(JSON.stringify(res));
            this.rootNode = <DocumentNode>{
              id: ROOT_ID,
              name: ROOT_ID,
              children: jsonObject.documents,
            };
            this.pinnedNode = <DocumentNode>{
              id: PINNED_ID,
              name: PINNED_ID,
              children: jsonObject.pinned,
            };
            this.trashNode = <DocumentNode>{
              id: TRASH_ID,
              name: TRASH_ID,
              children: jsonObject.trash,
            };

            if (jsonObject.trash) {
              jsonObject.trash.forEach((v) => {
                this.setDeletedandUnpin(v);
              });
            }
            this.dataChange.next([
              this.pinnedNode,
              this.rootNode,
              this.trashNode,
            ]);

            this.rootNodeMap.set(this.rootNode.id, this.rootNode);
            this.rootNodeMap.set(this.trashNode.id, this.trashNode);

            if (jsonObject.documents) {
              jsonObject.documents.forEach((v) => {
                this.rootNodeMap.set(v.id, v);
                this.addFlatToMap(this.rootNodeMap, v);
              });
            }

            if (jsonObject.pinned) {
              jsonObject.pinned.forEach((v) => {
                this.pinnedNodeMap.set(v.id, v);
                this.addFlatToMap(this.pinnedNodeMap, v);
              });
            }

            if (jsonObject.trash) {
              jsonObject.trash.forEach((v) => {
                this.rootNodeMap.set(v.id, v);
                this.addFlatToMap(this.rootNodeMap, v);
              });
            }

            this.route.paramMap.subscribe((params) => {
              if (!params.get('id')) {
                if (this.pinnedNode.children) {
                  this.basicRestService
                    .get('document/' + this.pinnedNode.children[0].id)
                    .subscribe((result) => {
                      const document = JSON.parse(JSON.stringify(result));
                      this.initContentChange.next({
                        id: document.id,
                        title: document.title,
                        content: document.content,
                        isPublic: document.isPublic,
                      });
                    });
                } else if (this.rootNode.children) {
                  this.basicRestService
                    .get('document/' + this.rootNode.children[0].id)
                    .subscribe((result) => {
                      const document = JSON.parse(JSON.stringify(result));
                      this.initContentChange.next({
                        id: document.id,
                        title: document.title,
                        content: document.content,
                        isPublic: document.isPublic,
                      });
                    });
                }
              }
            });
          },
        });
    }
  }

  addFlatToMap(map: Map<string, DocumentNode>, node: DocumentNode) {
    if (node.children) {
      node.children.forEach((v) => {
        map.set(v.id, v);
        this.addFlatToMap(map, v);
      });
    }
  }

  setNotDeleted(node: DocumentNode) {
    node.deleted = false;
    if (node.children)
      node.children.forEach((v) => {
        this.setNotDeleted(v);
      });
  }

  setDeletedandUnpin(node: DocumentNode) {
    node.deleted = true;
    this.rootNodeMap.set(node.id, node);
    if (node.pinned) {
      node.pinned = false;
      this.pinnedNodeMap.delete(node.id);
      this.removeFromParent(this.pinnedNode, node.id);
    }
    if (node.children)
      node.children.forEach((v) => {
        this.setDeletedandUnpin(v);
      });
  }

  removeFromParent(parent: DocumentNode, id: string) {
    if (parent.children) {
      parent.children = parent.children.filter((c) => c.id !== id);
      if (parent.children.length === 0) parent.children = null;
    }
  }

  insertItem(parent: DocumentFlatNode, vName: string): DocumentNode {
    const child = <DocumentNode>{
      id: uuid.v4(),
      name: vName,
      parent: parent.id,
      pinned: false,
      deleted: false,
    };
    this.rootNodeMap.set(child.id, child);
    // only add in root tree
    const parentInRoot = this.rootNodeMap.get(parent.id);
    if (parentInRoot.children) {
      parentInRoot.children = [child].concat(parentInRoot.children);
      this.dataChange.next(this.data);
    } else {
      parentInRoot.children = [];
      parentInRoot.children.push(child);
      this.dataChange.next(this.data);
    }
    return parentInRoot;
  }

  deleteEmptyItem(node: DocumentFlatNode) {
    const parent = this.rootNodeMap.get(node.parent);
    this.removeFromParent(parent, node.id);

    this.dataChange.next(this.data);
    this.basicRestService
      .post('saveDocumentTree', {
        id: localStorage.getItem('currentUserId'),
        documents: JSON.parse(JSON.stringify(this.rootNode.children)),
        trash: JSON.parse(JSON.stringify(this.trashNode.children)),
        pinned: JSON.parse(JSON.stringify(this.pinnedNode.children)),
      })
      .subscribe();
  }

  removeFromDocuments(node: DocumentNode) {
    if (node.parent === ROOT_ID) {
      this.removeFromParent(this.rootNode, node.id);
    } else {
      const parent = this.rootNodeMap.get(node.parent);
      this.removeFromParent(parent, node.id);
    }
    this.dataChange.next(this.data);
  }

  moveToTrash(node: DocumentNode) {
    if (!this.trashNode.children) this.trashNode.children = [];
    this.trashNode.children.push(node);

    this.dataChange.next(this.data);
    this.basicRestService
      .post('saveDocumentTree', {
        id: localStorage.getItem('currentUserId'),
        documents: JSON.parse(JSON.stringify(this.rootNode.children)),
        trash: JSON.parse(JSON.stringify(this.trashNode.children)),
        pinned: JSON.parse(JSON.stringify(this.pinnedNode.children)),
      })
      .subscribe();
  }

  removeFromTrash(node: DocumentNode) {
    this.removeFromParent(this.trashNode, node.id);

    this.dataChange.next(this.data);
    this.basicRestService
      .post('saveDocumentTree', {
        id: localStorage.getItem('currentUserId'),
        documents: JSON.parse(JSON.stringify(this.rootNode.children)),
        trash: JSON.parse(JSON.stringify(this.trashNode.children)),
        pinned: JSON.parse(JSON.stringify(this.pinnedNode.children)),
      })
      .subscribe(() => {
        // TODO here delete post
      });
  }

  saveItem(node: DocumentNode, newName: string, newItem: boolean) {
    const node_ = this.rootNodeMap.get(node.id);
    node_.name = newName;

    if (node.pinned) {
      const pinnedNode = this.pinnedNodeMap.get(node.id);
      pinnedNode.name = newName;
    }

    if (newItem) this.rootNodeMap.set(node.id, node);

    this.dataChange.next(this.data);

    this.basicRestService
      .post('saveDocumentTree', {
        id: localStorage.getItem('currentUserId'),
        documents: JSON.parse(JSON.stringify(this.rootNode.children)),
        trash: JSON.parse(JSON.stringify(this.trashNode.children)),
        pinned: JSON.parse(JSON.stringify(this.pinnedNode.children)),
      })
      .subscribe(() => {
        if (newItem) {
          this.basicRestService
            .post('saveDocument', {
              document: {
                id: node.id,
                userId: localStorage.getItem('currentUserId'),
                title: newName,
                content: 'new document',
              },
            })
            .subscribe(() => {
              this.initContentChange.next({
                id: node.id,
                title: newName,
                content: 'new document',
              });
            });
        } else {
          this.basicRestService
            .post('saveDocumentTitle', {
              id: node.id,
              title: newName,
            })
            .subscribe();
        }
      });
  }

  restoreItem(
    node: DocumentNode,
    parentToInsertId: string,
    parentToRemoveId: string = null,
  ) {
    this.setNotDeleted(node);

    const parentToInsert = this.rootNodeMap.get(parentToInsertId);

    if (!parentToInsert.children) parentToInsert.children = [];

    // insert node
    parentToInsert.children.push(node);

    if (!parentToRemoveId) {
      // parent not deleted, remove node from trash
      this.removeFromParent(this.trashNode, node.id);
    } else {
      const parentToRemove = this.rootNodeMap.get(parentToRemoveId);
      // parent in trash, remove node from parent.children
      this.removeFromParent(parentToRemove, node.id);
    }

    this.rootNodeMap.set(node.id, node);

    this.dataChange.next(this.data);

    this.basicRestService
      .post('saveDocumentTree', {
        id: localStorage.getItem('currentUserId'),
        documents: JSON.parse(JSON.stringify(this.rootNode.children)),
        trash: JSON.parse(JSON.stringify(this.trashNode.children)),
        pinned: JSON.parse(JSON.stringify(this.pinnedNode.children)),
      })
      .subscribe();
  }

  pinItem(node: DocumentNode) {
    node.pinned = !node.pinned;
    // pin node
    if (node.pinned) {
      if (!this.pinnedNode.children) this.pinnedNode.children = [];

      // add copy of pinned node to pinnedNodeTree
      const nodeCopy = <DocumentNode>{
        id: node.id,
        name: node.name,
        parent: PINNED_ID,
        children: null,
        pinned: true,
      };
      this.pinnedNode.children.push(nodeCopy);

      // add copy of pinned node to pinnedNodeMap
      this.pinnedNodeMap.set(node.id, nodeCopy);

      // pin node in rootNodeMap if node was pinned on pinnedNodeTree
      this.rootNodeMap.get(node.id).pinned = true;
    }
    // unpin Node
    else {
      this.pinnedNode.children = this.pinnedNode.children.filter(
        (c) => c.id !== node.id,
      );

      if (this.pinnedNode.children.length === 0)
        this.pinnedNode.children = null;

      this.rootNodeMap.get(node.id).pinned = false;
      this.pinnedNodeMap.delete(node.id);
    }

    this.dataChange.next(this.data);
    this.basicRestService
      .post('saveDocumentTree', {
        id: localStorage.getItem('currentUserId'),
        documents: JSON.parse(JSON.stringify(this.rootNode.children)),
        trash: JSON.parse(JSON.stringify(this.trashNode.children)),
        pinned: JSON.parse(JSON.stringify(this.pinnedNode.children)),
      })
      .subscribe();
  }

  refreshTree() {
    if (this.treeControl.isExpanded(this.nestedNodeMap.get(this.rootNode))) {
      this.treeControl.collapse(this.nestedNodeMap.get(this.rootNode));
      this.treeControl.expand(this.nestedNodeMap.get(this.rootNode));
    }
    if (this.treeControl.isExpanded(this.nestedNodeMap.get(this.pinnedNode))) {
      this.treeControl.collapse(this.nestedNodeMap.get(this.pinnedNode));
      this.treeControl.expand(this.nestedNodeMap.get(this.pinnedNode));
    }
  }

  /**
   * Transformer to convert nested node to flat node. Record the nodes in maps for later use.
   */
  transformer = (node: DocumentNode, level: number) => {
    const flatNode =
      this.nestedNodeMap.has(node) &&
      this.nestedNodeMap.get(node)!.name === node.name
        ? this.nestedNodeMap.get(node)!
        : new DocumentFlatNode();
    flatNode.name = node.name;
    flatNode.id = node.id;
    flatNode.parent = node.parent;
    flatNode.level = level;
    flatNode.deleted = node.deleted;
    flatNode.pinned = node.pinned;
    flatNode.expandable = !!node.children;
    this.flatNodeMap.set(flatNode, node);
    this.nestedNodeMap.set(node, flatNode);
    return flatNode;
  };

  getLevel = (node: DocumentFlatNode) => {
    return node.level;
  };

  isExpandable = (node: DocumentFlatNode) => {
    return node.expandable;
  };

  getChildren = (node: DocumentNode): Observable<DocumentNode[]> => {
    return ofObservable(node.children);
  };
}
