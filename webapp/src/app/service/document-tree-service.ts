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
import { v4 } from 'uuid';
import { BasicRestService } from './basic-rest.service';
import { CdkDragDrop } from '@angular/cdk/drag-drop';

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
  deleted: boolean;
  pinned: boolean;
  lastModified?: Date;
  children?: DocumentNode[];
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

      this.treeControl.collapse(this.nestedNodeMap.get(this.rootNode));
      this.treeControl.expand(this.nestedNodeMap.get(this.rootNode));
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
                          deleted: document.deleted,
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
                          deleted: document.deleted,
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
                        deleted: document.deleted,
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
                        deleted: document.deleted,
                      });
                    });
                }
              }
            });
          },
        });
    }
  }

  addNewItem(node: DocumentFlatNode) {
    if (!node) {
      node = this.nestedNodeMap.get(this.rootNode);
    }
    const parentInRoot = this.insertItem(node, '');
    this.treeControl.expand(this.nestedNodeMap.get(parentInRoot));
    this.refreshTree();
  }

  private insertItem(parent: DocumentFlatNode, vName: string): DocumentNode {
    const child = <DocumentNode>{
      id: v4(),
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
      .post('saveDocumentTree', this.getDocumentTree())
      .subscribe();

    this.treeControl.collapse(this.nestedNodeMap.get(this.rootNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.rootNode));
  }

  moveToTrash(node: DocumentFlatNode) {
    const nestedNode = this.flatNodeMap.get(node);
    if (!this.trashNode.children) this.trashNode.children = [];

    // remove from parent in documents
    // this.removeFromDocuments(nestedNode);
    if (node.parent === ROOT_ID) {
      this.removeFromParent(this.rootNode, node.id);
    } else {
      const parent = this.rootNodeMap.get(node.parent);
      this.removeFromParent(parent, node.id);
    }

    // set node and children as deleted
    // unpin node and children
    this.setDeletedandUnpin(nestedNode);

    // move node to trash
    this.trashNode.children.push(nestedNode);

    this.dataChange.next(this.data);
    this.basicRestService
      .post('saveDocumentTree', this.getDocumentTree())
      .subscribe();

    this.refreshTree();

    this.treeControl.collapse(this.nestedNodeMap.get(this.trashNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.trashNode));
  }

  removeFromTrash(node: DocumentFlatNode) {
    this.removeFromParent(this.trashNode, node.id);

    this.dataChange.next(this.data);
    this.basicRestService
      .post('saveDocumentTree', this.getDocumentTree())
      .subscribe(() => {
        this.basicRestService
          .delete('deleteDocument/' + node.id)
          .subscribe(() => {
            if (!environment.production) {
              this.basicRestService
                .post('vector-embeddings', {
                  Records: [
                    {
                      body: {
                        userId: localStorage.getItem('currentUserId'),
                        documentId: node.id,
                        deleteVectors: true,
                      },
                    },
                  ],
                })
                .subscribe();
            }
          });
      });
    this.treeControl.collapse(this.nestedNodeMap.get(this.trashNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.trashNode));

    this.basicRestService
      .get('document/' + this.rootNode.children[0].id)
      .subscribe((result) => {
        const document = JSON.parse(JSON.stringify(result));
        this.initContentChange.next({
          id: document.id,
          title: document.title,
          content: document.content,
          isPublic: document.isPublic,
          deleted: document.deleted,
        });
      });
  }

  saveItem(node: DocumentFlatNode, itemName: string, newItem: boolean) {
    const nestedNode = this.flatNodeMap.get(node);
    this.saveNode(nestedNode!, itemName, newItem);
    this.treeControl.collapse(this.nestedNodeMap.get(this.rootNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.rootNode));
  }

  private saveNode(node: DocumentNode, newName: string, newItem: boolean) {
    const node_ = this.rootNodeMap.get(node.id);
    node_.name = newName;
    node_.lastModified = new Date();

    if (node.pinned) {
      const pinnedNode = this.pinnedNodeMap.get(node.id);
      pinnedNode.name = newName;
      pinnedNode.lastModified = node_.lastModified;
    }

    if (newItem) this.rootNodeMap.set(node.id, node);

    this.dataChange.next(this.data);

    this.basicRestService
      .post('saveDocumentTree', this.getDocumentTree())
      .subscribe(() => {
        if (newItem) {
          this.basicRestService
            .post('saveDocument', {
              document: {
                id: node.id,
                userId: localStorage.getItem('currentUserId'),
                title: newName,
                content: 'new document',
                lastModified: node_.lastModified,
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

  restoreItem(node: DocumentFlatNode) {
    const nodeToRestore = this.flatNodeMap.get(node);
    const parentToRemoveId = `${nodeToRestore.parent}`;

    if (node.parent === ROOT_ID) {
      this.restoreNode(nodeToRestore, node.parent);
    } else {
      let parentToInsert: DocumentNode = this.rootNodeMap.get(node.parent);
      if (parentToInsert.deleted) {
        parentToInsert = this.getNearestParentThatIsNotDeleted(nodeToRestore);
        if (parentToInsert) nodeToRestore.parent = parentToInsert.id;
        else nodeToRestore.parent = ROOT_ID;
      }
      this.restoreNode(
        nodeToRestore,
        parentToInsert.id,
        parentToInsert.id === parentToRemoveId ? null : parentToRemoveId,
      );
    }

    this.refreshTree();
    this.treeControl.collapse(this.nestedNodeMap.get(this.trashNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.trashNode));
  }

  private getNearestParentThatIsNotDeleted(node: DocumentNode): DocumentNode {
    let parentNode;
    for (const element of this.flatNodeMap.values()) {
      if (element.id === node.parent) {
        if (element.deleted) {
          parentNode = this.getNearestParentThatIsNotDeleted(element);
          break;
        } else {
          parentNode = element;
          break;
        }
      }
    }
    return parentNode;
  }

  private restoreNode(
    node: DocumentNode,
    parentToInsertId: string,
    parentToRemoveId: string = null,
  ) {
    this.setNotDeleted(node);

    const parentToInsert = this.rootNodeMap.get(parentToInsertId);

    if (!parentToInsert.children) parentToInsert.children = [];

    // insert node
    parentToInsert.children.push(node);

    if (parentToRemoveId) {
      // parent in trash, remove node from parent.children
      const parentToRemove = this.rootNodeMap.get(parentToRemoveId);
      this.removeFromParent(parentToRemove, node.id);
    }
    this.removeFromParent(this.trashNode, node.id);

    this.rootNodeMap.set(node.id, node);

    this.dataChange.next(this.data);

    this.basicRestService
      .post('saveDocumentTree', this.getDocumentTree())
      .subscribe();
  }

  pinItem(node: DocumentFlatNode) {
    const nestedNode = this.flatNodeMap.get(node);
    this.pinNode(nestedNode);
    this.treeControl.collapse(this.nestedNodeMap.get(this.pinnedNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.pinnedNode));
  }

  private pinNode(node: DocumentNode) {
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
      .post('saveDocumentTree', this.getDocumentTree())
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

  expandNode(node: DocumentFlatNode) {
    this.treeControl.expand(node);
  }

  dropNode(event: CdkDragDrop<string[]>) {
    if (!event.isPointerOverContainer) return;

    const draggedNode: DocumentFlatNode = event.item.data;

    this.treeControl.collapse(draggedNode);

    let visibleNodes = this.visibleNodes(
      event.item.data.parent === PINNED_ID,
      event.item.data.deleted,
    );

    const currentIndexOfDraggedNode = visibleNodes.findIndex(
      (v) => v.id === draggedNode.id,
    );

    let dropIndex = event.currentIndex;

    const pinnedNodes = this.pinnedNode.children
      ? this.pinnedNode.children.length
      : 0;
    const pinnedExpanded = this.treeControl.isExpanded(
      this.nestedNodeMap.get(this.pinnedNode),
    );

    if (
      !draggedNode.deleted &&
      pinnedExpanded &&
      event.item.data.parent !== PINNED_ID
    ) {
      dropIndex = dropIndex - pinnedNodes;
    } else if (draggedNode.deleted) {
      const visibleRootNodes = visibleNodes.filter((x) => !x.deleted).length;
      visibleNodes = visibleNodes.filter((x) => x.deleted);
      if (
        this.treeControl.isExpanded(this.nestedNodeMap.get(this.pinnedNode))
      ) {
        dropIndex -= pinnedNodes;
      }
      if (this.treeControl.isExpanded(this.nestedNodeMap.get(this.rootNode))) {
        dropIndex -= visibleRootNodes;
      }
    }

    if (currentIndexOfDraggedNode == dropIndex) return;

    let dropIndexIncremented = false;

    // drop node at lower position, special handling
    if (currentIndexOfDraggedNode < dropIndex) {
      const nodeAtDropIndex = visibleNodes[dropIndex];
      if (!nodeAtDropIndex) return;
      if (
        nodeAtDropIndex.children &&
        this.treeControl.isExpanded(this.nestedNodeMap.get(nodeAtDropIndex))
      ) {
        dropIndex++;
        dropIndexIncremented = true;
      }
    }

    function findNodeSiblings(arr: Array<any>, id: string): Array<any> {
      let result, subResult;
      arr.forEach((item) => {
        if (item.id === id) {
          result = arr;
        } else if (item.children) {
          subResult = findNodeSiblings(item.children, id);
          if (subResult) result = subResult;
        }
      });
      return result;
    }

    // determine where to insert the node
    const nodeAtDest = visibleNodes[dropIndex];

    if (nodeAtDest.id == draggedNode.id) return;

    let searchTree;
    const changedData = this.dataSource.data;
    if (draggedNode.deleted) {
      searchTree = changedData.find((n) => n.id === TRASH_ID);
    } else if (event.item.data.parent === PINNED_ID) {
      searchTree = changedData.find((n) => n.id === PINNED_ID);
    } else {
      searchTree = changedData.find((n) => n.id === ROOT_ID);
    }

    const newSiblings = findNodeSiblings(searchTree.children, nodeAtDest.id);

    if (!newSiblings) return;
    let insertIndex = newSiblings.findIndex((s) => s.id === nodeAtDest.id);

    if (!dropIndexIncremented && currentIndexOfDraggedNode < dropIndex) {
      if (this.nestedNodeMap.get(nodeAtDest).level != draggedNode.level) {
        insertIndex++;
      }
    }

    // remove the node from its old place
    const oldSiblings = findNodeSiblings(searchTree.children, draggedNode.id);

    const siblingIndex = oldSiblings.findIndex((n) => n.id === draggedNode.id);

    const nodeToInsert: DocumentNode = oldSiblings.splice(siblingIndex, 1)[0];

    nodeToInsert.parent = nodeAtDest.parent.slice();

    // insert node
    newSiblings.splice(insertIndex, 0, nodeToInsert);

    this.rebuildTreeForData(changedData);
  }

  updateLastModifiedDate(id: string) {
    const node = this.rootNodeMap.get(id);
    node.lastModified = new Date();

    if (node.pinned) {
      const pinnedNode = this.pinnedNodeMap.get(id);
      pinnedNode.lastModified = node.lastModified;
    }

    this.dataChange.next(this.data);
    return node.lastModified;
  }

  isExpanded(node: DocumentFlatNode) {
    return this.treeControl.isExpanded(node);
  }

  getDocumentTree() {
    return {
      id: localStorage.getItem('currentUserId'),
      documents: JSON.parse(JSON.stringify(this.rootNode.children)),
      trash: JSON.parse(JSON.stringify(this.trashNode.children)),
      pinned: JSON.parse(JSON.stringify(this.pinnedNode.children)),
    };
  }

  /**
   * Transformer to convert nested node to flat node. Record the nodes in maps for later use.
   */
  private transformer = (node: DocumentNode, level: number) => {
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

  private getLevel = (node: DocumentFlatNode) => {
    return node.level;
  };

  private isExpandable = (node: DocumentFlatNode) => {
    return node.expandable;
  };

  private setNotDeleted(node: DocumentNode) {
    node.deleted = false;
    if (node.children)
      node.children.forEach((v) => {
        this.setNotDeleted(v);
      });
  }

  private addFlatToMap(map: Map<string, DocumentNode>, node: DocumentNode) {
    if (node.children) {
      node.children.forEach((v) => {
        map.set(v.id, v);
        this.addFlatToMap(map, v);
      });
    }
  }

  private setDeletedandUnpin(node: DocumentNode) {
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

  private removeFromParent(parent: DocumentNode, id: string) {
    if (parent.children) {
      parent.children = parent.children.filter((c) => c.id !== id);
      if (parent.children.length === 0) parent.children = null;
    }
  }
  /*
    find all visible nodes regardless of the level, except the dragged node, and return it as a flat list
  */
  private visibleNodes(inPinned: boolean, deleted: boolean): DocumentNode[] {
    const result = [];
    this.dataSource.data.forEach((node) => {
      this.addExpandedChildren(
        node,
        this.treeControl.isExpanded(this.nestedNodeMap.get(node)),
        inPinned,
        deleted,
        result,
      );
    });
    return result;
  }

  private addExpandedChildren(
    node: DocumentNode,
    expanded: boolean,
    inPinned: boolean,
    deleted: boolean,
    result: any,
  ) {
    if (node.id !== ROOT_ID && node.id !== PINNED_ID && node.id !== TRASH_ID) {
      if (inPinned && node.parent === PINNED_ID) {
        result.push(node);
      } else if (!inPinned && node.parent !== PINNED_ID) {
        result.push(node);
      }
    }
    if (expanded && node.children) {
      node.children.map((child) =>
        this.addExpandedChildren(
          child,
          this.treeControl.isExpanded(this.nestedNodeMap.get(child)),
          inPinned,
          deleted,
          result,
        ),
      );
    }
  }

  private rebuildTreeForData(data: any) {
    this.dataSource.data = data;
    this.refreshTree();
    this.basicRestService
      .post('saveDocumentTree', this.getDocumentTree())
      .subscribe();
  }

  private getChildren = (node: DocumentNode): Observable<DocumentNode[]> => {
    return ofObservable(node.children);
  };
}
