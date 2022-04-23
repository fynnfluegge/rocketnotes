import { Component, OnInit, Injectable } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { HttpClient, HttpParams, HttpHeaders  } from '@angular/common/http';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { of as ofObservable, Observable, BehaviorSubject } from 'rxjs';
import * as uuid from 'uuid';
import { TestServiceService } from 'src/app/service/rest/test-service.service';
import { Auth } from 'aws-amplify';
import { ConsoleLogger } from '@aws-amplify/core';

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
  backend_url: string =  "https://6o4c2p3kcg.execute-api.eu-central-1.amazonaws.com";
  rootNode: TodoItemNode;
  trashNode: TodoItemNode;
  pinnedNode: TodoItemNode;

  rootNodeMap: Map<string, TodoItemNode> = new Map(); 
  pinnedNodeMap: Map<string, TodoItemNode> = new Map(); 


  dataChange: BehaviorSubject<TodoItemNode[]> = new BehaviorSubject<TodoItemNode[]>([]);

  get data(): TodoItemNode[] {
    return this.dataChange.value;
  }

  constructor(public http: HttpClient, private testService : TestServiceService) {
    this.initialize();
  }

  initialize() {

    this.http.get(this.backend_url + '/documentTree/' + localStorage.getItem("currentUserId")).subscribe({
      next: (res) => {
        const jsonObject = JSON.parse(JSON.stringify(res))
        this.rootNode = <TodoItemNode>{ id: "root", name: "root", children: jsonObject.documents };
        this.pinnedNode = <TodoItemNode>{ id: "pinned", name: "pinned", children: jsonObject.pinned };
        this.trashNode = <TodoItemNode>{ id: "trash", name: "trash", children: jsonObject.trash };
        if (jsonObject.trash) {
          jsonObject.trash.forEach(v => { this.setDeletedandUnpin(v) })
        }
        this.dataChange.next([this.pinnedNode, this.rootNode, this.trashNode]);

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
      },
      error: (e) => {
        this.rootNode = <TodoItemNode>{ id: "root", name: "root", children: null };
        this.trashNode = <TodoItemNode>{ id: "trash", name: "trash", children: null };
        this.pinnedNode = <TodoItemNode>{ id: "pinned", name: "pinned", children: null };
        this.dataChange.next([this.pinnedNode, this.rootNode, this.trashNode]);
      }
    })
  }

  addFlatToMap(map: Map<string, TodoItemNode>, node: TodoItemNode) {
    if (node.children) {
      node.children.forEach(v => {
        map.set(v.id, v);
        this.addFlatToMap(map, v);
      })
    }
  }
  
  setDeletedandUnpin(node: TodoItemNode) {
    node.deleted = true
    if (node.pinned) {
      node.pinned = false;
      if (this.pinnedNode.children) {
        this.pinnedNode.children = this.pinnedNode.children.filter(c => c.id !== node.id);
        if (this.pinnedNode.children.length === 0) this.pinnedNode.children = null;
      }
      this.pinnedNodeMap.delete(node.id);
    }
    if (node.children) node.children.forEach(v => { this.setDeletedandUnpin(v) })
  }

  setNotDeleted(node: TodoItemNode) {
    node.deleted = false
    if (node.children) node.children.forEach(v => { this.setNotDeleted(v) })
  }
 
  insertItem(parent: TodoItemNode, vName: string) {
    const child = <TodoItemNode>{ id: uuid.v4(), name: vName, parent: parent.id, pinned: false, deleted: false };
    if (parent.children) {
      parent.children.push(child);
      this.dataChange.next(this.data);
    } else {
      parent.children = [];
      parent.children.push(child);
      this.dataChange.next(this.data);
    }
  }

   deleteItem(parent: TodoItemNode, node: TodoItemFlatNode) {
     parent.children = parent.children.filter(c => c.id !== node.id);
     if (parent.children.length === 0 ) parent.children = null;
     this.dataChange.next(this.data);
   }

  removeFromParent(parent: TodoItemNode, node: TodoItemNode) {
    if (parent.children) {
      parent.children = parent.children.filter(c => c.id !== node.id);
      if (parent.children.length === 0 ) parent.children = null; 
      this.dataChange.next(this.data);
    }
  }

  moveToTrash(node: TodoItemNode) {
    if (!this.trashNode.children) this.trashNode.children = [];
    this.trashNode.children.push(node);

    this.dataChange.next(this.data);
    this.testService.post("saveDocumentTree", 
    { 
      "ID": localStorage.getItem("currentUserId"),
      "documents": JSON.parse(JSON.stringify(this.rootNode.children)),
      "trash": JSON.parse(JSON.stringify(this.trashNode.children)),
      "pinned": JSON.parse(JSON.stringify(this.pinnedNode.children))
    }).subscribe()
  }
 
   saveItem(node: TodoItemNode, vName: string, newItem: boolean) {
    node.name = vName;
    this.dataChange.next(this.data);

    this.rootNodeMap.set(node.id, node);

    this.testService.post("saveDocumentTree", 
      { 
        "ID": localStorage.getItem("currentUserId"),
        "documents": JSON.parse(JSON.stringify(this.rootNode.children)),
        "trash": JSON.parse(JSON.stringify(this.trashNode.children)),
        "pinned": JSON.parse(JSON.stringify(this.pinnedNode.children))
      }
    ).subscribe(() => {
      if (newItem) {
        this.testService.post("saveDocument", 
        { 
          "ID": node.id,
          "parentId": node.parent,
          "userId": localStorage.getItem("currentUserId"),
          "title": vName,
          "content": "new document"
        }).subscribe()
      } else {
        this.testService.post("saveDocumentTitle", 
        { 
          "id": node.id,
          "title": vName
        }).subscribe()
      }
    })
   }

   restoreItem(node: TodoItemNode, parentToInsert: TodoItemNode, parentToRemove: TodoItemNode = null) {

      this.setNotDeleted(node)

      if (!parentToInsert.children) parentToInsert.children = [];

      // insert node
      parentToInsert.children.push(node)

      if (!parentToRemove) {
        console.log("remove from trash")
        // parent not deleted, remove node from trash
        if (this.trashNode.children) {
          this.trashNode.children = this.trashNode.children.filter(c => c.id !== node.id);
          if (this.trashNode.children.length == 0) this.trashNode.children = null;
        }
      }
      else {
        // parent in trash, remove node from parent.children
        if (parentToRemove.children) {
          parentToRemove.children = parentToRemove.children.filter(c => c.id !== node.id);
          if (parentToRemove.children.length === 0) parentToRemove.children = null;
        }
      }

      this.rootNodeMap.set(node.id, node);

      this.dataChange.next(this.data);

      this.testService.post("saveDocumentTree", 
      { 
        "ID": localStorage.getItem("currentUserId"),
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
      var nodeCopy = <TodoItemNode>{ id: node.id, name: node.name, parent: node.parent, children: null, pinned: true }
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
      "ID": localStorage.getItem("currentUserId"),
      "documents": JSON.parse(JSON.stringify(this.rootNode.children)),
      "trash": JSON.parse(JSON.stringify(this.trashNode.children)),
      "pinned": JSON.parse(JSON.stringify(this.pinnedNode.children))
    }).subscribe()
  }
}


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [ChecklistDatabase],
})
export class AppComponent {
  showSidebar = true

  /** Map from flat node to nested node. This helps us finding the nested node to be modified */
  flatNodeMap: Map<TodoItemFlatNode, TodoItemNode> = new Map<TodoItemFlatNode,TodoItemNode>();

  /** Map from nested node to flattened node. This helps us to keep the same object for selection */
  nestedNodeMap: Map<TodoItemNode, TodoItemFlatNode> = new Map<TodoItemNode,TodoItemFlatNode>();

  /** A selected parent node to be inserted */
  selectedParent: TodoItemFlatNode | null = null;

  treeControl: FlatTreeControl<TodoItemFlatNode>;

  treeFlattener: MatTreeFlattener<TodoItemNode, TodoItemFlatNode>;

  dataSource: MatTreeFlatDataSource<TodoItemNode, TodoItemFlatNode>;

  constructor(private database: ChecklistDatabase) {
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
    return _nodeData.id === "root";
  };

  isTrash = (_: number, _nodeData: TodoItemFlatNode) => {
    return _nodeData.id === "trash";
  };

  isPinned = (_: number, _nodeData: TodoItemFlatNode) => {
    return _nodeData.id === "pinned";
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
    const parentNode = this.flatNodeMap.get(node);
    this.database.insertItem(parentNode!, '');

    this.treeControl.expand(node);
    this.treeControl.collapse(this.nestedNodeMap.get(this.database.rootNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.rootNode));
  }

  editItem(node: TodoItemFlatNode) {
    node.editNode = true;
    this.treeControl.collapse(this.nestedNodeMap.get(this.database.rootNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.rootNode));
  }

  cancelEditItem(node: TodoItemFlatNode) {
    node.editNode = false;
    this.treeControl.collapse(this.nestedNodeMap.get(this.database.rootNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.rootNode));
  }

  deleteItem(node: TodoItemFlatNode) {
    var parentNode;
    this.flatNodeMap.forEach(element => {
      if (element.id === node.parent) {
        parentNode = element
      }
    })
    this.database.deleteItem(parentNode!, node);

    this.treeControl.collapse(this.nestedNodeMap.get(this.database.rootNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.rootNode));
  }

  moveToTrash(node: TodoItemFlatNode) {
    var nestedNode = this.flatNodeMap.get(node);

    // remove from documents and pinned
    this.flatNodeMap.forEach(element => {
      if (element.id === node.parent) {
        this.database.removeFromParent(element, nestedNode);
      }
    })

    this.database.setDeletedandUnpin(nestedNode);

    // move node to trash
    this.database.moveToTrash(nestedNode);

    this.treeControl.collapse(this.nestedNodeMap.get(this.database.pinnedNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.pinnedNode));

    this.treeControl.collapse(this.nestedNodeMap.get(this.database.rootNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.rootNode));

    this.treeControl.collapse(this.nestedNodeMap.get(this.database.trashNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.trashNode));
  }

  saveNode(node: TodoItemFlatNode, itemValue: string, newItem: boolean) {
    const nestedNode = this.flatNodeMap.get(node);
    this.database.saveItem(nestedNode!, itemValue, newItem);
    this.treeControl.collapse(this.nestedNodeMap.get(this.database.rootNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.rootNode));
  }

  restoreItem(node: TodoItemFlatNode) {
    const nodeToRestore = this.flatNodeMap.get(node);
    
    for (let element of this.flatNodeMap.values()) {
      if (element.id === node.parent /*&& !element.isInPinnedTree*/) {
        console.log("parent found")
        if (element.id === "root") {
          console.log("parent root")
          this.database.restoreItem(nodeToRestore, element)
        } else {
          console.log("parent not root")
          console.log(element.id)

          var parentToInsert: TodoItemNode = element;

          if (element.deleted) {
            parentToInsert = this.getNearestParentThatIsNotDeleted(nodeToRestore)
            console.log("new parent")
            console.log(parentToInsert.id)
            if (parentToInsert)
              nodeToRestore.parent = parentToInsert.id
            else
              nodeToRestore.parent = "root"
          }
          
          this.database.restoreItem(nodeToRestore, parentToInsert, parentToInsert.id === element.id ? null : element)
        }
        break;
      }
    }

    this.treeControl.collapse(this.nestedNodeMap.get(this.database.rootNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.rootNode));

    this.treeControl.collapse(this.nestedNodeMap.get(this.database.pinnedNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.pinnedNode));

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
    this.flatNodeMap.forEach(element => {
      if (element.id === node.parent) {
        if (element.deleted) {
          parentNode = this.getNearestParentThatIsNotDeleted(element)
          return;
        }
        else {
          parentNode = element
          return;
        }
      }
    })
    return parentNode;
  }

  onMenuToggle(): void {
    this.showSidebar = !this.showSidebar;
  }

  onLogout(): void {
    console.log(Auth.currentUserInfo().then((user: any ) => {
      console.log(user.username)
    }))
    Auth.signOut();
  }
}
