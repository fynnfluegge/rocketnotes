import { AfterViewInit, Component, Injectable, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { of as ofObservable, Observable, BehaviorSubject, Subject } from 'rxjs';
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
 * Node for to-do item
 */
 export class TodoItemNode {
  id: string;
  name: string;
  parent: string;
  children?: TodoItemNode[];
  deleted: boolean;
  pinned: boolean;
}

/** Flat to-do item node with expandable and level information */
export class TodoItemFlatNode {
  id: string;
  name: string;
  parent: string;
  deleted: boolean;
  pinned: boolean;
  editNode: boolean;
  level: number;
  expandable: boolean;
}

/**
 * Checklist database, it can build a tree structured Json object.
 * Each node in Json object represents a to-do item or a category.
 * If a node is a category, it has children items and new items can be added under the category.
 */
@Injectable()
export class ChecklistDatabase {
  backend_url = environment.apiUrl;
  rootNode: TodoItemNode;
  trashNode: TodoItemNode;
  pinnedNode: TodoItemNode;

  rootNodeMap: Map<string, TodoItemNode> = new Map(); 
  pinnedNodeMap: Map<string, TodoItemNode> = new Map();

  dataChange: BehaviorSubject<TodoItemNode[]> = new BehaviorSubject<TodoItemNode[]>([]);

  initContentChange: Subject<any> = new Subject<any>();

  get data(): TodoItemNode[] {
    return this.dataChange.value;
  }

  constructor(public http: HttpClient, private testService : BasicRestService, private route: ActivatedRoute) {
    this.initialize();
  }

  initialize() {

    // since localStorage.getItem("currentUserId") may not yet be initialized Auth.currentAuthenticatedUser() is used
    Auth.currentAuthenticatedUser().then((user) => {
      this.http.get(this.backend_url + '/documentTree/' + user.username).subscribe({
        next: (res) => {
          const jsonObject = JSON.parse(JSON.stringify(res))
          this.rootNode = <TodoItemNode>{ id: ROOT_ID, name: ROOT_ID, children: jsonObject.documents };
          this.pinnedNode = <TodoItemNode>{ id: PINNED_ID, name: PINNED_ID, children: jsonObject.pinned };
          this.trashNode = <TodoItemNode>{ id: TRASH_ID, name: TRASH_ID, children: jsonObject.trash };
  
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
                  this.initContentChange.next({ id: document.id, title: document.title, content: document.content });
                });
              } else if (this.rootNode.children) {
                this.testService.get("document/" + this.rootNode.children[0].id).subscribe(result => {
                  var document = JSON.parse(JSON.stringify(result));
                  this.initContentChange.next({ id: document.id, title: document.title, content: document.content });
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
  }

  addFlatToMap(map: Map<string, TodoItemNode>, node: TodoItemNode) {
    if (node.children) {
      node.children.forEach(v => {
        map.set(v.id, v);
        this.addFlatToMap(map, v);
      })
    }
  }

  setNotDeleted(node: TodoItemNode) {
    node.deleted = false
    if (node.children) node.children.forEach(v => { this.setNotDeleted(v) })
  }
  
  setDeletedandUnpin(node: TodoItemNode) {
    node.deleted = true
    this.rootNodeMap.set(node.id, node)
    if (node.pinned) {
      node.pinned = false;
      this.pinnedNodeMap.delete(node.id)
      this.removeFromParent(this.pinnedNode, node.id)
    }
    if (node.children) node.children.forEach(v => { this.setDeletedandUnpin(v) })
  }

  removeFromParent(parent: TodoItemNode, id: string) {
    if (parent.children) {
      parent.children = parent.children.filter(c => c.id !== id);
      if (parent.children.length === 0) parent.children = null;
    }
  }

  insertItem(parent: TodoItemFlatNode, vName: string): TodoItemNode{
    const child = <TodoItemNode>{ id: uuid.v4(), name: vName, parent: parent.id, pinned: false, deleted: false };
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

   deleteEmptyItem(node: TodoItemFlatNode) {
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

  removeFromDocuments(node: TodoItemNode) {
    if (node.parent === ROOT_ID) {
      this.removeFromParent(this.rootNode, node.id)
    } else {
      const parent = this.rootNodeMap.get(node.parent)
      this.removeFromParent(parent, node.id)
    }
    this.dataChange.next(this.data);
  }

  moveToTrash(node: TodoItemNode) {
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

  removeFromTrash(node: TodoItemNode) {
    this.removeFromParent(this.trashNode, node.id)

    this.dataChange.next(this.data);
    this.testService.post("saveDocumentTree", 
    { 
      "id": localStorage.getItem("currentUserId"),
      "documents": JSON.parse(JSON.stringify(this.rootNode.children)),
      "trash": JSON.parse(JSON.stringify(this.trashNode.children)),
      "pinned": JSON.parse(JSON.stringify(this.pinnedNode.children))
    }).subscribe(() => {
      // here delete post
    })
  }
 
  saveItem(node: TodoItemNode, newName: string, newItem: boolean) {
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

   restoreItem(node: TodoItemNode, parentToInsertId: string, parentToRemoveId: string = null) {

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

  pinItem(node: TodoItemNode) {
    node.pinned = !node.pinned
    // PIN Node
    if (node.pinned) {
      if (!this.pinnedNode.children) this.pinnedNode.children = [];

      // add copy of pinned node to pinnedNodeTree
      var nodeCopy = <TodoItemNode>{ id: node.id, name: node.name, parent: PINNED_ID, children: null, pinned: true }
      this.pinnedNode.children.push(nodeCopy);

      // add copy of pinned node to pinnedNodeMap
      this.pinnedNodeMap.set(node.id, nodeCopy);

      // pin node in rootNodeMap if node was pinned on pinnedNodeTree
      this.rootNodeMap.get(node.id).pinned = true;
    } 
    // UNPIN Node
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
  providers: [ChecklistDatabase],
})
export class SidenavComponent implements OnInit, AfterViewInit{

  username: string;

  initContent: string;

  showSidebar = true

  dragging = false;
  expandTimeout: any;
  expandDelay = 1000;

  /** Map from flat node to nested node. This helps us finding the nested node to be modified */
  flatNodeMap: Map<TodoItemFlatNode, TodoItemNode> = new Map<TodoItemFlatNode,TodoItemNode>();

  /** Map from nested node to flattened node. This helps us to keep the same object for selection */
  nestedNodeMap: Map<TodoItemNode, TodoItemFlatNode> = new Map<TodoItemNode,TodoItemFlatNode>();

  /** A selected parent node to be inserted */
  selectedParent: TodoItemFlatNode | null = null;

  treeControl: FlatTreeControl<TodoItemFlatNode>;

  treeFlattener: MatTreeFlattener<TodoItemNode, TodoItemFlatNode>;

  dataSource: MatTreeFlatDataSource<TodoItemNode, TodoItemFlatNode>;

  constructor(private database: ChecklistDatabase, private testService : BasicRestService, private router: Router) {

    this.treeFlattener = new MatTreeFlattener(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren
    );
    this.treeControl = new FlatTreeControl<TodoItemFlatNode>(
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
  }

  @HostListener('window:resize', ['$event'])
    getScreenSize(event?) {
        if (window.innerWidth < 768) {
          this.showSidebar = false;
        }
    }

  ngAfterViewInit(): void {
    this.autocomplete(document.getElementById("search_documents"), this.testService, this.router);
  }

  ngOnInit(): void {
    this.username = localStorage.getItem("username");
  }

  getLevel = (node: TodoItemFlatNode) => {
    return node.level;
  };

  isExpandable = (node: TodoItemFlatNode) => {
    return node.expandable;
  };

  getChildren = (node: TodoItemNode): Observable<TodoItemNode[]> => {
    return ofObservable(node.children);
  };

  isRoot = (_: number, _nodeData: TodoItemFlatNode) => {
    return _nodeData.id === ROOT_ID;
  };

  isTrash = (_: number, _nodeData: TodoItemFlatNode) => {
    return _nodeData.id === TRASH_ID;
  };

  isPinned = (_: number, _nodeData: TodoItemFlatNode) => {
    return _nodeData.id === PINNED_ID;
  };

  editNode = (_: number, _nodeData: TodoItemFlatNode) => {
    return _nodeData.editNode;
  };

  hasChild = (_: number, _nodeData: TodoItemFlatNode) => {
    return _nodeData.expandable;
  };

  hasNoContent = (_: number, _nodeData: TodoItemFlatNode) => {
    return _nodeData.name === '';
  };

  /**
   * Transformer to convert nested node to flat node. Record the nodes in maps for later use.
   */
  transformer = (node: TodoItemNode, level: number) => {
    let flatNode =
      this.nestedNodeMap.has(node) &&
      this.nestedNodeMap.get(node)!.name === node.name
        ? this.nestedNodeMap.get(node)!
        : new TodoItemFlatNode();
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

  addNewItem(node: TodoItemFlatNode) {
    this.showSidebar = true;
    if (!node) {
      node = this.nestedNodeMap.get(this.database.rootNode);
    }
    var parentInRoot = this.database.insertItem(node, '');
    this.treeControl.expand(this.nestedNodeMap.get(parentInRoot));
    this.refreshTree();
  }

  editItem(node: TodoItemFlatNode) {
    node.editNode = true;
    this.refreshTree();
  }

  cancelEditItem(node: TodoItemFlatNode) {
    node.editNode = false;
    this.refreshTree()
  }

  deleteEmptyItem(node: TodoItemFlatNode) {
    this.database.deleteEmptyItem(node);

    this.treeControl.collapse(this.nestedNodeMap.get(this.database.rootNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.rootNode));
  }

  moveToTrash(node: TodoItemFlatNode) {
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

  removeFromTrash(node: TodoItemFlatNode) {
    if (confirm('Are you sure you want to permanently delete ' + node.name + '?')) {
      var nestedNode = this.flatNodeMap.get(node);

      this.database.removeFromTrash(nestedNode);

      this.treeControl.collapse(this.nestedNodeMap.get(this.database.trashNode));
      this.treeControl.expand(this.nestedNodeMap.get(this.database.trashNode));

      // todo load first document
      this.router.navigate(['/' + this.database.rootNode.children[0].id]);
    }
  }

  saveNode(node: TodoItemFlatNode, itemValue: string, newItem: boolean) {
    const nestedNode = this.flatNodeMap.get(node);
    this.database.saveItem(nestedNode!, itemValue, newItem);
    this.treeControl.collapse(this.nestedNodeMap.get(this.database.rootNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.rootNode));
  }

  restoreItem(node: TodoItemFlatNode) {
    const nodeToRestore = this.flatNodeMap.get(node);
    const parentToRemoveId = `${nodeToRestore.parent}`;

    if (node.parent === ROOT_ID) {
      this.database.restoreItem(nodeToRestore, node.parent)
    } else {
      var parentToInsert: TodoItemNode = this.database.rootNodeMap.get(node.parent);
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

  pinItem(node: TodoItemFlatNode) {
    const nestedNode = this.flatNodeMap.get(node);
    this.database.pinItem(nestedNode);
    this.treeControl.collapse(this.nestedNodeMap.get(this.database.pinnedNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.pinnedNode));
  }

  getNearestParentThatIsNotDeleted(node: TodoItemNode): TodoItemNode {
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
  dragHover(node: TodoItemFlatNode) {
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

    const draggedNode: TodoItemFlatNode = event.item.data;

    this.treeControl.collapse(draggedNode);

    let visibleNodes = this.visibleNodes(event.item.data.parent === PINNED_ID, event.item.data.deleted);

    const currentIndexOfDraggedNode = visibleNodes.findIndex(v => v.id === draggedNode.id);

    // console.log("CURRENT INDEX OF DRAGGED NODE");console.log(currentIndexOfDraggedNode);console.log("------------");
    // console.log("VISIBLE NODES");console.log(visibleNodes);console.log("------------");

    let dropIndex = event.currentIndex;

    let pinnedNodes = this.database.pinnedNode.children ? this.database.pinnedNode.children.length : 0;
    let pinnedExpanded = this.treeControl.isExpanded(this.nestedNodeMap.get(this.database.pinnedNode))

    // console.log("DROP INDEX");console.log(dropIndex);

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

    // console.log(dropIndex);console.log("------------");

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

    // console.log("NODE AT DEST");console.log(nodeAtDest);console.log("------------");

    let searchTree;
    const changedData = this.dataSource.data;
    if (draggedNode.deleted) {
      searchTree = changedData.find(n => n.id === TRASH_ID)
    } else if (event.item.data.parent === PINNED_ID) {
      searchTree = changedData.find(n => n.id === PINNED_ID)
    } else {
      searchTree = changedData.find(n => n.id === ROOT_ID)
    }
    
    // console.log("SEARCH TREE");console.log(searchTree);console.log("------------");

    const newSiblings = findNodeSiblings(searchTree.children, nodeAtDest.id);
    
    // console.log("NEW SIBLINGS");console.log(newSiblings);console.log("---------");

    if (!newSiblings) return;
    let insertIndex = newSiblings.findIndex(s => s.id === nodeAtDest.id);

    if (!dropIndexIncremented && currentIndexOfDraggedNode < dropIndex) {
      if (this.nestedNodeMap.get(nodeAtDest).level != draggedNode.level) {
        insertIndex++;
      }
    }

    // console.log("INSERT INDEX");console.log(insertIndex);console.log("---------");

    // remove the node from its old place
    const oldSiblings = findNodeSiblings(searchTree.children, draggedNode.id);

    // console.log("SIBLINGS");console.log(oldSiblings);console.log("---------");

    const siblingIndex = oldSiblings.findIndex(n => n.id === draggedNode.id);

    // console.log("SIBLINGS INDEX");console.log(siblingIndex);console.log("---------");

    const nodeToInsert: TodoItemNode = oldSiblings.splice(siblingIndex, 1)[0];
    // if (nodeAtDest.id === nodeToInsert.id) return; ERROR: if true dragged node will disappear after save

    // console.log("NODE TO INSERT");console.log(nodeToInsert);console.log("---------");

    // ensure validity of drop - must be same level
    // const nodeAtDestFlatNode = this.treeControl.dataNodes.find((n) => nodeAtDest.id === n.id);
    // if (this.validateDrop && nodeAtDestFlatNode.level !== draggedNode.level) {
    //   alert('Items can only be moved within the same level.');
    //   return;
    // }

    nodeToInsert.parent = nodeAtDest.parent.slice();

    // insert node 
    newSiblings.splice(insertIndex, 0, nodeToInsert);
    
    this.rebuildTreeForData(changedData);
  }

  /*
    find all visible nodes regardless of the level, except the dragged node, and return it as a flat list
  */
  visibleNodes(inPinned: boolean, deleted: boolean): TodoItemNode[] {
    const result = [];
    this.dataSource.data.forEach((node) => {
      this.addExpandedChildren(node, this.treeControl.isExpanded(this.nestedNodeMap.get(node)), inPinned, deleted, result);
    });
    return result;
  }

  addExpandedChildren(node: TodoItemNode, expanded: boolean, inPinned: boolean, deleted: boolean, result: any) {
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
            var startIndex = suggestion.indexOf(val);
            b.innerHTML += suggestion.substring(0, startIndex);
            b.innerHTML += "<strong>" + val + "</strong>";
            b.innerHTML += suggestion.substring(startIndex + val.length);
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
      const startOffset = content.indexOf(searchPattern);
      const endOffset = offset - startOffset;
      if (offset >= 28) {
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
      else {
        return content;
      }
    }
    /*execute a function when someone clicks in the document:*/
    document.addEventListener("click", function (e) {
        closeAllLists(e.target);
    });
  }
}
