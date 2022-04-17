import { Component, OnInit, Injectable } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { HttpClient, HttpParams, HttpHeaders  } from '@angular/common/http';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { of as ofObservable, Observable, BehaviorSubject } from 'rxjs';
import * as uuid from 'uuid';
import { TestServiceService } from 'src/app/service/rest/test-service.service';
import { Auth } from 'aws-amplify';

/**
 * Node for to-do item
 */
 export class TodoItemNode {
  id: string;
  name: string;
  parent: string;
  deleted: boolean;
  pinned: boolean;
  children?: TodoItemNode[];
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
        if (jsonObject.trash) {
          jsonObject.trash.forEach(v => { this.setDeleted(v) })
        }
        if (jsonObject.pinned) {
          jsonObject.pinned.forEach(v => { v.pinned = true })
        }
        this.trashNode = <TodoItemNode>{ id: "trash", name: "trash", children: jsonObject.trash };
        this.pinnedNode = <TodoItemNode>{ id: "pinned", name: "pinned", children: jsonObject.pinned };
        this.dataChange.next([this.pinnedNode, this.rootNode, this.trashNode]);
      },
      error: (e) => {
        console.log("ERROR")
        console.log(e)
        this.rootNode = <TodoItemNode>{ id: "root", name: "root", children: null };
        this.trashNode = <TodoItemNode>{ id: "trash", name: "trash", children: null };
        this.pinnedNode = <TodoItemNode>{ id: "pinned", name: "pinned", children: null };
        this.dataChange.next([this.pinnedNode, this.rootNode, this.trashNode]);
      }
    })
  }

    setDeleted(node: TodoItemNode) {
      node.deleted = true
      if (node.children) node.children.forEach(v => { this.setDeleted(v) })
    }

    setNotDeleted(node: TodoItemNode) {
      node.deleted = false
      if (node.children) node.children.forEach(v => { this.setNotDeleted(v) })
    }
 
   insertItem(parent: TodoItemNode, vName: string) {
     const child = <TodoItemNode>{ id: uuid.v4(), name: vName, parent: parent.id };
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
     console.log(parent)
     parent.children = parent.children.filter(c => c.id !== node.id);
     if (parent.children.length === 0 ) parent.children = null;
     this.dataChange.next(this.data);
   }

   removeItem(parent: TodoItemNode, node: TodoItemNode) {
    this.setDeleted(node)
     parent.children = parent.children.filter(c => c.id !== node.id);
     if (parent.children.length === 0 ) parent.children = null;
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
 
   updateItem(node: TodoItemNode, vName: string) {
    node.name = vName;
    node.children = null;
    this.dataChange.next(this.data);

    this.testService.post("saveDocumentTree", 
      { 
        "ID": localStorage.getItem("currentUserId"),
        "documents": JSON.parse(JSON.stringify(this.rootNode.children)),
        "trash": JSON.parse(JSON.stringify(this.trashNode.children)),
        "pinned": JSON.parse(JSON.stringify(this.pinnedNode.children))
      }
    ).subscribe(() => { 
      this.testService.post("saveDocument", 
      { 
        "ID": node.id,
        "parentId": node.parent,
        "userId": localStorage.getItem("currentUserId"),
        "title": vName,
        "content": "new document"
      }).subscribe()
    })
   }

   restoreItem(node: TodoItemNode, parentToInsert: TodoItemNode, parent: TodoItemNode) {
      this.setNotDeleted(node)
      if (!parentToInsert.children) parentToInsert.children = [];
      parentToInsert.children.push(node)

      if (parentToInsert.id === parent.id) {
        // parent not deleted, remove node from trash
        this.trashNode.children = this.trashNode.children.filter(c => c.id !== node.id);
        if (this.trashNode.children.length == 0) this.trashNode.children = null;
      }
      else {
        // parent also deleted, remove node from children of parent in trash
        parent.children = parent.children.filter(c => c.id !== node.id);
        if (parent.children.length === 0) parent.children = null;
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

  pinItem(node: TodoItemNode) {
    node.pinned = !node.pinned
    if (node.pinned) {
      if (!this.pinnedNode.children) this.pinnedNode.children = [];
      this.pinnedNode.children.push(node);
    } else if (this.pinnedNode.children){
      this.pinnedNode.children = this.pinnedNode.children.filter(c => c.id !== node.id);
      if (this.pinnedNode.children.length === 0) this.pinnedNode.children = null;
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

  /** The new item's name */
  newItemName: string = '';

  treeControl: FlatTreeControl<TodoItemFlatNode>;

  treeFlattener: MatTreeFlattener<TodoItemNode, TodoItemFlatNode>;

  dataSource: MatTreeFlatDataSource<TodoItemNode, TodoItemFlatNode>;

  /** The selection for checklist */
  checklistSelection = new SelectionModel<TodoItemFlatNode>(
    true /* multiple */
  );

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

  removeItem(node: TodoItemFlatNode) {
    this.flatNodeMap.forEach(element => {
      if (element.id === node.parent) {
        this.database.removeItem(element, this.flatNodeMap.get(node));
      }
    })

    this.treeControl.collapse(this.nestedNodeMap.get(this.database.rootNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.rootNode));

    this.treeControl.collapse(this.nestedNodeMap.get(this.database.trashNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.trashNode));
  }

  saveNode(node: TodoItemFlatNode, itemValue: string) {
    const nestedNode = this.flatNodeMap.get(node);
    this.database.updateItem(nestedNode!, itemValue);
    this.treeControl.collapse(this.nestedNodeMap.get(this.database.rootNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.rootNode));
  }

  restoreItem(node: TodoItemFlatNode) {
    const nodeToRestore = this.flatNodeMap.get(node);
    var parent
    var parentToInsert
    this.flatNodeMap.forEach(element => {
      if (element.id === node.parent) {
        parent = element
      }
    })
    if (parent.deleted) {
      parentToInsert = this.getNearestParentThatIsNotDeleted(nodeToRestore)
    } else {
      parentToInsert = parent
    }

    nodeToRestore.parent = parentToInsert.id

    this.database.restoreItem(nodeToRestore, parentToInsert, parent)

    this.treeControl.collapse(this.nestedNodeMap.get(this.database.rootNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.rootNode));

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
