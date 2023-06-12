import { AfterViewInit, Component, Injectable, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { of as ofObservable, Observable, BehaviorSubject, Subject, ConnectableObservable } from 'rxjs';
import * as uuid from 'uuid';
import { BasicRestService } from 'src/app/service/basic-rest.service';
import { Auth } from 'aws-amplify';
import { environment } from 'src/environments/environment';
import { ActivatedRoute } from '@angular/router';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { HostListener } from "@angular/core";

const ROOT_ID: string = "root";
const PINNED_ID: string = "pinned";
const TRASH_ID: string = "trash";

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

@Injectable()
export class DocumentTree {
  backend_url = environment.apiUrl;
  rootNode: DocumentNode;
  trashNode: DocumentNode;
  pinnedNode: DocumentNode;

  rootNodeMap: Map<string, DocumentNode> = new Map(); 
  pinnedNodeMap: Map<string, DocumentNode> = new Map();

  dataChange: BehaviorSubject<DocumentNode[]> = new BehaviorSubject<DocumentNode[]>([]);

  initContentChange: Subject<any> = new Subject<any>();

  get data(): DocumentNode[] {
    return this.dataChange.value;
  }

  constructor(public http: HttpClient, private testService : BasicRestService, private route: ActivatedRoute) {
    this.initialize();
  }

  initialize() {

    // since localStorage.getItem("currentUserId") may not yet be initialized Auth.currentAuthenticatedUser() is used
    if (environment.production) {
      Auth.currentAuthenticatedUser().then((user) => {
        this.http.get(this.backend_url + '/documentTree/' + user.username).subscribe({
          next: (res) => {
            const jsonObject = JSON.parse(JSON.stringify(res))
            this.rootNode = <DocumentNode>{ id: ROOT_ID, name: ROOT_ID, children: jsonObject.documents };
            this.pinnedNode = <DocumentNode>{ id: PINNED_ID, name: PINNED_ID, children: jsonObject.pinned };
            this.trashNode = <DocumentNode>{ id: TRASH_ID, name: TRASH_ID, children: jsonObject.trash };
    
            if (jsonObject.trash) {
              jsonObject.trash.forEach(v => { this.setDeletedandUnpin(v) })
            }
            this.dataChange.next([this.pinnedNode, this.rootNode, this.trashNode]);
    
            this.rootNodeMap.set(this.rootNode.id, this.rootNode);
            this.rootNodeMap.set(this.trashNode.id, this.trashNode);
    
            if (jsonObject.documents) {
              jsonObject.documents.forEach(v => {
                this.rootNodeMap.set(v.id, v);
                this.addFlatToMap(this.rootNodeMap, v)
              })
            }
    
            if (jsonObject.pinned) {
              jsonObject.pinned.forEach(v => {
                this.pinnedNodeMap.set(v.id, v);
                this.addFlatToMap(this.pinnedNodeMap, v)
              })
            }
    
            if (jsonObject.trash) {
              jsonObject.trash.forEach(v => {
                this.rootNodeMap.set(v.id, v);
                this.addFlatToMap(this.rootNodeMap, v)
              })
            }
    
            this.route.paramMap.subscribe(params => { 
              if (!params.get('id')) {
                if (this.pinnedNode.children) {
                  this.testService.get("document/" + this.pinnedNode.children[0].id).subscribe(result => {
                    var document = JSON.parse(JSON.stringify(result));
                    this.initContentChange.next({ id: document.id, title: document.title, content: document.content, isPublic: document.isPublic });
                  });
                } else if (this.rootNode.children) {
                  this.testService.get("document/" + this.rootNode.children[0].id).subscribe(result => {
                    var document = JSON.parse(JSON.stringify(result));
                    this.initContentChange.next({ id: document.id, title: document.title, content: document.content, isPublic: document.isPublic });
                  });
                }
              } else {
              }
            });
          },
          error: (e) => {
          }
        })
      });
    } else {
      this.testService.get("documentTree/4afe1f16-add0-11ed-afa1-0242ac120002").subscribe({
        next: (res) => {
          const jsonObject = JSON.parse(JSON.stringify(res))
          this.rootNode = <DocumentNode>{ id: ROOT_ID, name: ROOT_ID, children: jsonObject.documents };
          this.pinnedNode = <DocumentNode>{ id: PINNED_ID, name: PINNED_ID, children: jsonObject.pinned };
          this.trashNode = <DocumentNode>{ id: TRASH_ID, name: TRASH_ID, children: jsonObject.trash };
  
          if (jsonObject.trash) {
            jsonObject.trash.forEach(v => { this.setDeletedandUnpin(v) })
          }
          this.dataChange.next([this.pinnedNode, this.rootNode, this.trashNode]);
  
          this.rootNodeMap.set(this.rootNode.id, this.rootNode);
          this.rootNodeMap.set(this.trashNode.id, this.trashNode);
  
          if (jsonObject.documents) {
            jsonObject.documents.forEach(v => {
              this.rootNodeMap.set(v.id, v);
              this.addFlatToMap(this.rootNodeMap, v)
            })
          }
  
          if (jsonObject.pinned) {
            jsonObject.pinned.forEach(v => {
              this.pinnedNodeMap.set(v.id, v);
              this.addFlatToMap(this.pinnedNodeMap, v)
            })
          }
  
          if (jsonObject.trash) {
            jsonObject.trash.forEach(v => {
              this.rootNodeMap.set(v.id, v);
              this.addFlatToMap(this.rootNodeMap, v)
            })
          }
  
          this.route.paramMap.subscribe(params => { 
            if (!params.get('id')) {
              if (this.pinnedNode.children) {
                this.testService.get("document/" + this.pinnedNode.children[0].id).subscribe(result => {
                  var document = JSON.parse(JSON.stringify(result));
                  this.initContentChange.next({ id: document.id, title: document.title, content: document.content, isPublic: document.isPublic });
                });
              } else if (this.rootNode.children) {
                this.testService.get("document/" + this.rootNode.children[0].id).subscribe(result => {
                  var document = JSON.parse(JSON.stringify(result));
                  this.initContentChange.next({ id: document.id, title: document.title, content: document.content, isPublic: document.isPublic });
                });
              }
            } else {
            }
          });
        },
        error: (e) => {
        }
      })
    }
    
  }

  addFlatToMap(map: Map<string, DocumentNode>, node: DocumentNode) {
    if (node.children) {
      node.children.forEach(v => {
        map.set(v.id, v);
        this.addFlatToMap(map, v);
      })
    }
  }

  setNotDeleted(node: DocumentNode) {
    node.deleted = false
    if (node.children) node.children.forEach(v => { this.setNotDeleted(v) })
  }
  
  setDeletedandUnpin(node: DocumentNode) {
    node.deleted = true
    this.rootNodeMap.set(node.id, node)
    if (node.pinned) {
      node.pinned = false;
      this.pinnedNodeMap.delete(node.id)
      this.removeFromParent(this.pinnedNode, node.id)
    }
    if (node.children) node.children.forEach(v => { this.setDeletedandUnpin(v) })
  }

  removeFromParent(parent: DocumentNode, id: string) {
    if (parent.children) {
      parent.children = parent.children.filter(c => c.id !== id);
      if (parent.children.length === 0) parent.children = null;
    }
  }

  insertItem(parent: DocumentFlatNode, vName: string): DocumentNode{
    const child = <DocumentNode>{ id: uuid.v4(), name: vName, parent: parent.id, pinned: false, deleted: false };
    this.rootNodeMap.set(child.id, child);
    // only add in root tree
    const parentInRoot = this.rootNodeMap.get(parent.id)
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
    const parent = this.rootNodeMap.get(node.parent)
    this.removeFromParent(parent, node.id)
    
    this.dataChange.next(this.data);
    this.testService.post("saveDocumentTree",
    { 
      "id": localStorage.getItem("currentUserId"),
      "documents": JSON.parse(JSON.stringify(this.rootNode.children)),
      "trash": JSON.parse(JSON.stringify(this.trashNode.children)),
      "pinned": JSON.parse(JSON.stringify(this.pinnedNode.children))
    }).subscribe()
   }

  removeFromDocuments(node: DocumentNode) {
    if (node.parent === ROOT_ID) {
      this.removeFromParent(this.rootNode, node.id)
    } else {
      const parent = this.rootNodeMap.get(node.parent)
      this.removeFromParent(parent, node.id)
    }
    this.dataChange.next(this.data);
  }

  moveToTrash(node: DocumentNode) {
    if (!this.trashNode.children) this.trashNode.children = [];
    this.trashNode.children.push(node);

    this.dataChange.next(this.data);
    this.testService.post("saveDocumentTree", 
    { 
      "id": localStorage.getItem("currentUserId"),
      "documents": JSON.parse(JSON.stringify(this.rootNode.children)),
      "trash": JSON.parse(JSON.stringify(this.trashNode.children)),
      "pinned": JSON.parse(JSON.stringify(this.pinnedNode.children))
    }).subscribe()
  }

  removeFromTrash(node: DocumentNode) {
    this.removeFromParent(this.trashNode, node.id)

    this.dataChange.next(this.data);
    this.testService.post("saveDocumentTree", 
    { 
      "id": localStorage.getItem("currentUserId"),
      "documents": JSON.parse(JSON.stringify(this.rootNode.children)),
      "trash": JSON.parse(JSON.stringify(this.trashNode.children)),
      "pinned": JSON.parse(JSON.stringify(this.pinnedNode.children))
    }).subscribe(() => {
      // TODO here delete post
    })
  }
 
  saveItem(node: DocumentNode, newName: string, newItem: boolean) {
  var node_ = this.rootNodeMap.get(node.id)
  node_.name = newName

  if (node.pinned) {
    var pinnedNode = this.pinnedNodeMap.get(node.id)
    pinnedNode.name = newName
  }

  if (newItem) this.rootNodeMap.set(node.id, node);

  this.dataChange.next(this.data);

  this.testService.post("saveDocumentTree", 
    { 
      "id": localStorage.getItem("currentUserId"),
      "documents": JSON.parse(JSON.stringify(this.rootNode.children)),
      "trash": JSON.parse(JSON.stringify(this.trashNode.children)),
      "pinned": JSON.parse(JSON.stringify(this.pinnedNode.children))
    }
  ).subscribe(() => {
    if (newItem) {
      this.testService.post("saveDocument", 
      { 
        "id": node.id,
        "userId": localStorage.getItem("currentUserId"),
        "title": newName,
        "content": "new document"
      }).subscribe(() => {
        this.initContentChange.next({ id: node.id, title: newName, content: "new document" });
      })
    } else {
      this.testService.post("saveDocumentTitle", 
      { 
        "id": node.id,
        "title": newName
      }).subscribe()
    }
  })
  }

   restoreItem(node: DocumentNode, parentToInsertId: string, parentToRemoveId: string = null) {

      this.setNotDeleted(node)

      const parentToInsert = this.rootNodeMap.get(parentToInsertId)

      if (!parentToInsert.children) parentToInsert.children = [];

      // insert node
      parentToInsert.children.push(node)

      if (!parentToRemoveId) {
        // parent not deleted, remove node from trash
        this.removeFromParent(this.trashNode, node.id)
      }
      else {
        const parentToRemove = this.rootNodeMap.get(parentToRemoveId)
        // parent in trash, remove node from parent.children
        this.removeFromParent(parentToRemove, node.id)
      }

      this.rootNodeMap.set(node.id, node);

      this.dataChange.next(this.data);

      this.testService.post("saveDocumentTree", 
      { 
        "id": localStorage.getItem("currentUserId"),
        "documents": JSON.parse(JSON.stringify(this.rootNode.children)),
        "trash": JSON.parse(JSON.stringify(this.trashNode.children)),
        "pinned": JSON.parse(JSON.stringify(this.pinnedNode.children))
      }).subscribe()
   }

  pinItem(node: DocumentNode) {
    node.pinned = !node.pinned
    // pin node
    if (node.pinned) {
      if (!this.pinnedNode.children) this.pinnedNode.children = [];

      // add copy of pinned node to pinnedNodeTree
      var nodeCopy = <DocumentNode>{ id: node.id, name: node.name, parent: PINNED_ID, children: null, pinned: true }
      this.pinnedNode.children.push(nodeCopy);

      // add copy of pinned node to pinnedNodeMap
      this.pinnedNodeMap.set(node.id, nodeCopy);

      // pin node in rootNodeMap if node was pinned on pinnedNodeTree
      this.rootNodeMap.get(node.id).pinned = true;
    } 
    // unpin Node
    else {
      this.pinnedNode.children = this.pinnedNode.children.filter(c => c.id !== node.id);

      if (this.pinnedNode.children.length === 0)
        this.pinnedNode.children = null;

      this.rootNodeMap.get(node.id).pinned = false
      this.pinnedNodeMap.delete(node.id)
    }

    this.dataChange.next(this.data);
    this.testService.post("saveDocumentTree", 
    { 
      "id": localStorage.getItem("currentUserId"),
      "documents": JSON.parse(JSON.stringify(this.rootNode.children)),
      "trash": JSON.parse(JSON.stringify(this.trashNode.children)),
      "pinned": JSON.parse(JSON.stringify(this.pinnedNode.children))
    }).subscribe()
  }
}

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss'],
  providers: [DocumentTree],
})
export class SidenavComponent implements OnInit, AfterViewInit{

  username: string;

  initContent: string;

  showSidebar = true

  dragging = false;
  expandTimeout: any;
  expandDelay = 1000;

  isMobileDevice = false;

  operatingSystem: string;

  /** Map from flat node to nested node. This helps us finding the nested node to be modified */
  flatNodeMap: Map<DocumentFlatNode, DocumentNode> = new Map<DocumentFlatNode,DocumentNode>();

  /** Map from nested node to flattened node. This helps us to keep the same object for selection */
  nestedNodeMap: Map<DocumentNode, DocumentFlatNode> = new Map<DocumentNode,DocumentFlatNode>();

  /** A selected parent node to be inserted */
  selectedParent: DocumentFlatNode | null = null;

  treeControl: FlatTreeControl<DocumentFlatNode>;

  treeFlattener: MatTreeFlattener<DocumentNode, DocumentFlatNode>;

  dataSource: MatTreeFlatDataSource<DocumentNode, DocumentFlatNode>;

  constructor(private database: DocumentTree, private testService : BasicRestService, private router: Router) {

    this.treeFlattener = new MatTreeFlattener(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren
    );
    this.treeControl = new FlatTreeControl<DocumentFlatNode>(
      this.getLevel,
      this.isExpandable
    );
    this.dataSource = new MatTreeFlatDataSource(
      this.treeControl,
      this.treeFlattener
    );

    database.dataChange.subscribe((data) => {
      this.dataSource.data = data;

      this.treeControl.collapse(this.nestedNodeMap.get(this.database.rootNode));
      this.treeControl.expand(this.nestedNodeMap.get(this.database.rootNode));
    });

    this.getScreenSize();
    this.getOperatingSystem();
  }

  getOperatingSystem() {
    var userAgent = navigator.userAgent;
  
    var operatingSystem = "";
    if (/Windows/i.test(userAgent)) {
      operatingSystem = "Windows";
    } else if (/Macintosh|Mac OS/i.test(userAgent)) {
      operatingSystem = "Mac";
    } else if (/Linux/i.test(userAgent)) {
      operatingSystem = "Linux";
    } else if (/Android/i.test(userAgent)) {
      operatingSystem = "Android";
    } else if (/iOS|iPhone|iPad|iPod/i.test(userAgent)) {
      operatingSystem = "iOS";
    }
  
    this.operatingSystem = operatingSystem;
  }
  

  @HostListener('window:resize', ['$event'])
    getScreenSize() {
        if (window.innerWidth < 768) {
          this.showSidebar = false;
        }
    }

  @HostListener('document:keydown.meta.k', ['$event']) 
    focusSearchInput(){
      document.getElementById("search_documents").focus();
    }

  ngAfterViewInit(): void {
    this.autocomplete(document.getElementById("search_documents"), this.testService, this.router);
  }

  ngOnInit(): void {
    this.username = localStorage.getItem("username");

    // check if opened on mobile browser, to prevent drag and drop
    this.isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(navigator.userAgent);
  }

  getLevel = (node: DocumentFlatNode) => {
    return node.level;
  };

  isExpandable = (node: DocumentFlatNode) => {
    return node.expandable;
  };

  getChildren = (node: DocumentNode): Observable<DocumentNode[]> => {
    return ofObservable(node.children);
  };

  isRoot = (_: number, _nodeData: DocumentFlatNode) => {
    return _nodeData.id === ROOT_ID;
  };

  isTrash = (_: number, _nodeData: DocumentFlatNode) => {
    return _nodeData.id === TRASH_ID;
  };

  isPinned = (_: number, _nodeData: DocumentFlatNode) => {
    return _nodeData.id === PINNED_ID;
  };

  editNode = (_: number, _nodeData: DocumentFlatNode) => {
    return _nodeData.editNode;
  };

  hasChild = (_: number, _nodeData: DocumentFlatNode) => {
    return _nodeData.expandable;
  };

  hasNoContent = (_: number, _nodeData: DocumentFlatNode) => {
    return _nodeData.name === '';
  };

  /**
   * Transformer to convert nested node to flat node. Record the nodes in maps for later use.
   */
  transformer = (node: DocumentNode, level: number) => {
    let flatNode =
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

  addNewItem(node: DocumentFlatNode) {
    this.showSidebar = true;
    if (!node) {
      node = this.nestedNodeMap.get(this.database.rootNode);
    }
    var parentInRoot = this.database.insertItem(node, '');
    this.treeControl.expand(this.nestedNodeMap.get(parentInRoot));
    this.refreshTree();
  }

  editItem(node: DocumentFlatNode) {
    node.editNode = true;
    this.refreshTree();
  }

  cancelEditItem(node: DocumentFlatNode) {
    node.editNode = false;
    this.refreshTree()
  }

  deleteEmptyItem(node: DocumentFlatNode) {
    this.database.deleteEmptyItem(node);

    this.treeControl.collapse(this.nestedNodeMap.get(this.database.rootNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.rootNode));
  }

  moveToTrash(node: DocumentFlatNode) {
    var nestedNode = this.flatNodeMap.get(node);

    // remove from parent in documents
    this.database.removeFromDocuments(nestedNode);
    
    // set node and children as deleted
    // unpin node and children
    this.database.setDeletedandUnpin(nestedNode);

    // move node to trash
    this.database.moveToTrash(nestedNode);

    this.refreshTree();

    this.treeControl.collapse(this.nestedNodeMap.get(this.database.trashNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.trashNode));
  }

  removeFromTrash(node: DocumentFlatNode) {
    if (confirm('Are you sure you want to permanently delete ' + node.name + '?')) {
      var nestedNode = this.flatNodeMap.get(node);

      this.database.removeFromTrash(nestedNode);

      this.treeControl.collapse(this.nestedNodeMap.get(this.database.trashNode));
      this.treeControl.expand(this.nestedNodeMap.get(this.database.trashNode));

      // todo load first document
      this.router.navigate(['/' + this.database.rootNode.children[0].id]);
    }
  }

  saveNode(node: DocumentFlatNode, itemValue: string, newItem: boolean) {
    const nestedNode = this.flatNodeMap.get(node);
    this.database.saveItem(nestedNode!, itemValue, newItem);
    this.treeControl.collapse(this.nestedNodeMap.get(this.database.rootNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.rootNode));
  }

  restoreItem(node: DocumentFlatNode) {
    const nodeToRestore = this.flatNodeMap.get(node);
    const parentToRemoveId = `${nodeToRestore.parent}`;

    if (node.parent === ROOT_ID) {
      this.database.restoreItem(nodeToRestore, node.parent)
    } else {
      var parentToInsert: DocumentNode = this.database.rootNodeMap.get(node.parent);
      if (parentToInsert.deleted) {
        parentToInsert = this.getNearestParentThatIsNotDeleted(nodeToRestore)
        if (parentToInsert)
          nodeToRestore.parent = parentToInsert.id
        else
          nodeToRestore.parent = ROOT_ID
      }
      this.database.restoreItem(nodeToRestore, parentToInsert.id, parentToInsert.id === parentToRemoveId ? null : parentToRemoveId)
    }

    this.refreshTree()

    this.treeControl.collapse(this.nestedNodeMap.get(this.database.trashNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.trashNode));
  }

  pinItem(node: DocumentFlatNode) {
    const nestedNode = this.flatNodeMap.get(node);
    this.database.pinItem(nestedNode);
    this.treeControl.collapse(this.nestedNodeMap.get(this.database.pinnedNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.pinnedNode));
  }

  getNearestParentThatIsNotDeleted(node: DocumentNode): DocumentNode {
    var parentNode;
    for (let element of this.flatNodeMap.values()) {
      if (element.id === node.parent) {
        if (element.deleted) {
          parentNode = this.getNearestParentThatIsNotDeleted(element)
          break;
        }
        else {
          parentNode = element
          break;
        }
      }
    }
    return parentNode;
  }

  refreshTree() {
    if (this.treeControl.isExpanded(this.nestedNodeMap.get(this.database.rootNode))) {
      this.treeControl.collapse(this.nestedNodeMap.get(this.database.rootNode));
      this.treeControl.expand(this.nestedNodeMap.get(this.database.rootNode));
    }
    if (this.treeControl.isExpanded(this.nestedNodeMap.get(this.database.pinnedNode))) {
      this.treeControl.collapse(this.nestedNodeMap.get(this.database.pinnedNode));
      this.treeControl.expand(this.nestedNodeMap.get(this.database.pinnedNode));
    }
  }

  onMenuToggle(): void {
    this.showSidebar = !this.showSidebar;
  }

  onLogout(): void {
    Auth.signOut();
  }

  // Drag & Drop
  dragStart() {
    this.dragging = true;
  }
  dragEnd() {
    this.dragging = false;
  }
  dragHover(node: DocumentFlatNode) {
    if (this.dragging) {
      clearTimeout(this.expandTimeout);
      this.expandTimeout = setTimeout(() => {
        this.treeControl.expand(node);
      }, this.expandDelay);
    }
  }
  dragHoverEnd() {
    if (this.dragging) {
      clearTimeout(this.expandTimeout);
    }
  }

  drop(event: CdkDragDrop<string[]>) {
    if (!event.isPointerOverContainer) return;

    const draggedNode: DocumentFlatNode = event.item.data;

    this.treeControl.collapse(draggedNode);

    let visibleNodes = this.visibleNodes(event.item.data.parent === PINNED_ID, event.item.data.deleted);

    const currentIndexOfDraggedNode = visibleNodes.findIndex(v => v.id === draggedNode.id);

    let dropIndex = event.currentIndex;

    let pinnedNodes = this.database.pinnedNode.children ? this.database.pinnedNode.children.length : 0;
    let pinnedExpanded = this.treeControl.isExpanded(this.nestedNodeMap.get(this.database.pinnedNode))

    if (!draggedNode.deleted && pinnedExpanded && event.item.data.parent !== PINNED_ID) {
      dropIndex = dropIndex - pinnedNodes;
    } 
    else if (draggedNode.deleted) {
      let visibleRootNodes = visibleNodes.filter(x => !x.deleted).length;
      visibleNodes = visibleNodes.filter(x => x.deleted);
      if (this.treeControl.isExpanded(this.nestedNodeMap.get(this.database.pinnedNode))) {
        dropIndex -= pinnedNodes;
      }
      if (this.treeControl.isExpanded(this.nestedNodeMap.get(this.database.rootNode))) {
        dropIndex -= visibleRootNodes;
      }
    }

    if (currentIndexOfDraggedNode == dropIndex) return;

    let dropIndexIncremented = false;

    // drop node at lower position, special handling
    if (currentIndexOfDraggedNode < dropIndex) {
      let nodeAtDropIndex = visibleNodes[dropIndex];
      if (!nodeAtDropIndex) return;
      if (nodeAtDropIndex.children && this.treeControl.isExpanded(this.nestedNodeMap.get(nodeAtDropIndex))){
        dropIndex++;
        dropIndexIncremented = true
      }
    }

    function findNodeSiblings(arr: Array<any>, id: string): Array<any> {
      let result, subResult;
      arr.forEach((item, i) => {
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
      searchTree = changedData.find(n => n.id === TRASH_ID)
    } else if (event.item.data.parent === PINNED_ID) {
      searchTree = changedData.find(n => n.id === PINNED_ID)
    } else {
      searchTree = changedData.find(n => n.id === ROOT_ID)
    }

    const newSiblings = findNodeSiblings(searchTree.children, nodeAtDest.id);

    if (!newSiblings) return;
    let insertIndex = newSiblings.findIndex(s => s.id === nodeAtDest.id);

    if (!dropIndexIncremented && currentIndexOfDraggedNode < dropIndex) {
      if (this.nestedNodeMap.get(nodeAtDest).level != draggedNode.level) {
        insertIndex++;
      }
    }

    // remove the node from its old place
    const oldSiblings = findNodeSiblings(searchTree.children, draggedNode.id);

    const siblingIndex = oldSiblings.findIndex(n => n.id === draggedNode.id);

    const nodeToInsert: DocumentNode = oldSiblings.splice(siblingIndex, 1)[0];

    nodeToInsert.parent = nodeAtDest.parent.slice();

    // insert node 
    newSiblings.splice(insertIndex, 0, nodeToInsert);
    
    this.rebuildTreeForData(changedData);
  }

  /*
    find all visible nodes regardless of the level, except the dragged node, and return it as a flat list
  */
  visibleNodes(inPinned: boolean, deleted: boolean): DocumentNode[] {
    const result = [];
    this.dataSource.data.forEach((node) => {
      this.addExpandedChildren(node, this.treeControl.isExpanded(this.nestedNodeMap.get(node)), inPinned, deleted, result);
    });
    return result;
  }

  addExpandedChildren(node: DocumentNode, expanded: boolean, inPinned: boolean, deleted: boolean, result: any) {
    if (node.id !== ROOT_ID && node.id !== PINNED_ID && node.id !== TRASH_ID) {
      if (inPinned && node.parent === PINNED_ID) {
        result.push(node);
      } 
      else if (!inPinned && node.parent !== PINNED_ID){
        result.push(node);
      }
    }
    if (expanded && node.children) {
      node.children.map((child) => this.addExpandedChildren(child, this.treeControl.isExpanded(this.nestedNodeMap.get(child)), inPinned, deleted, result));
    }
  }

  rebuildTreeForData(data: any) {
    this.dataSource.data = data;
    this.refreshTree();
    this.testService.post("saveDocumentTree",
    { 
      "id": localStorage.getItem("currentUserId"),
      "documents": JSON.parse(JSON.stringify(this.database.rootNode.children)),
      TRASH_ID: JSON.parse(JSON.stringify(this.database.trashNode.children)),
      PINNED_ID: JSON.parse(JSON.stringify(this.database.pinnedNode.children))
    }).subscribe()
  }

  autocomplete(inp: any, testService: BasicRestService, router: Router) {
    /*the autocomplete function takes two arguments,
    the text field element and an array of possible autocompleted values:*/
    var currentFocus;
    /*execute a function when someone writes in the text field:*/
    inp.addEventListener("input", async function() {
      var a, b, i, val = this.value;
      /*close any already open lists of autocompleted values*/
      closeAllLists(null);
      if (!val) { return false;}
      if (val.length > 2) {
        currentFocus = -1;
        /*create a DIV element that will contain the items (values):*/
        a = document.createElement("DIV");
        a.setAttribute("id", this.id + "autocomplete-list");
        a.setAttribute("class", "autocomplete-items");
        /*append the DIV element as a child of the autocomplete container:*/
        this.parentNode.appendChild(a);
        const result = await testService.get("search-documents/" + localStorage.getItem("currentUserId") + "?searchString=" + this.value).toPromise();
        const foundElements = JSON.parse(JSON.stringify(result))
        /*for each item in the array...*/
        for (i = 0; i < foundElements.length; i++) {
            /*create a DIV element for each matching element:*/
            b = document.createElement("DIV");
            b.innerHTML += "<strong style='font-size:18px;'>" + foundElements[i].title + "</strong></br>";
            var suggestion = suggestionToDisplay(foundElements[i].content, val);
            /*make the matching letters bold:*/
            var startIndex = suggestion.toLocaleLowerCase().indexOf(val.toLocaleLowerCase());
            if (startIndex > -1) {
              b.innerHTML += suggestion.substring(0, startIndex);
              b.innerHTML += "<strong>" + val + "</strong>";
              b.innerHTML += suggestion.substring(startIndex + val.length);
            } else {
              b.innerHTML += suggestion;
            }
            /*insert a input field that will hold the current array item's value:*/
            b.innerHTML += "<input type='hidden' value='" + foundElements[i].id + "'>";
            /*execute a function when someone clicks on the item value (DIV element):*/
            b.addEventListener("click", function(e) {
                router.navigate(['/' + this.getElementsByTagName("input")[0].value], { relativeTo: this.route });
                closeAllLists(null);
            });
            a.appendChild(b);
          }
        }
      // }
    });
    /*execute a function presses a key on the keyboard:*/
    inp.addEventListener("keydown", function(e) {
        var x = document.getElementById(this.id + "autocomplete-list");
        if (x) var suggestionList = x.getElementsByTagName("div");
        if (e.keyCode == 40) {
          /*If the arrow DOWN key is pressed,
          increase the currentFocus variable:*/
          currentFocus++;
          /*and and make the current item more visible:*/
          addActive(suggestionList);
        } else if (e.keyCode == 38) { //up
          /*If the arrow UP key is pressed,
          decrease the currentFocus variable:*/
          currentFocus--;
          /*and and make the current item more visible:*/
          addActive(suggestionList);
        } else if (e.keyCode == 13) {
          /*If the ENTER key is pressed, prevent the form from being submitted,*/
          e.preventDefault();
          if (currentFocus > -1) {
            /*and simulate a click on the "active" item:*/
            if (suggestionList) suggestionList[currentFocus].click();
          }
        }
    });
    function addActive(x: any) {
      /*a function to classify an item as "active":*/
      if (!x) return false;
      /*start by removing the "active" class on all items:*/
      removeActive(x);
      if (currentFocus >= x.length) currentFocus = 0;
      if (currentFocus < 0) currentFocus = (x.length - 1);
      /*add class "autocomplete-active":*/
      x[currentFocus].classList.add("autocomplete-active");
    }
    function removeActive(x: any) {
      /*a function to remove the "active" class from all autocomplete items:*/
      for (var i = 0; i < x.length; i++) {
        x[i].classList.remove("autocomplete-active");
      }
    }
    function closeAllLists(elmnt: any) {
      /*close all autocomplete lists in the document,
      except the one passed as an argument:*/
      var x = document.getElementsByClassName("autocomplete-items");
      for (var i = 0; i < x.length; i++) {
        if (elmnt != x[i] && elmnt != inp) {
          x[i].parentNode.removeChild(x[i]);
        }
      }
    }
    function suggestionToDisplay(content: string, searchPattern: string): string {
      const offset = content.length - searchPattern.length;
      const startOffset = content.toLocaleLowerCase().indexOf(searchPattern.toLocaleLowerCase());
      const endOffset = offset - startOffset;
      if (offset >= 28 && startOffset >= 0) {
        if (startOffset >= 14 && endOffset >= 14) {
          return "..." + content.substring(startOffset - 14, startOffset + searchPattern.length + 14) + "...";
        }
        if (startOffset < 14){
          return content.substring(0, searchPattern.length + 28) + "...";
        }
        if (endOffset < 14) {
          return "..." + content.substring(startOffset-28+endOffset, content.length);
        }
      }
      else if (startOffset === -1 && content.length > 28){
        return content.substring(0, 28) + "...";
      } else {
        return content;
      }
    }
    /*execute a function when someone clicks in the document:*/
    document.addEventListener("click", function (e) {
        closeAllLists(e.target);
    });
  }
}
