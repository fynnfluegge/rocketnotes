import { Component, OnInit, Injectable } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { HttpClient, HttpParams, HttpHeaders  } from '@angular/common/http';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { of as ofObservable, Observable, BehaviorSubject } from 'rxjs';
import * as uuid from 'uuid';
import { TestServiceService } from 'src/app/service/rest/test-service.service';

/**
 * Node for to-do item
 */
 export class TodoItemNode {
  id: string;
  name: string;
  children?: TodoItemNode[];
}

/** Flat to-do item node with expandable and level information */
export class TodoItemFlatNode {
  id: string;
  name: string;
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
  id: string
  rootNode: TodoItemNode;

   dataChange: BehaviorSubject<TodoItemNode[]> = new BehaviorSubject<TodoItemNode[]>([]);
 
   get data(): TodoItemNode[] {
     return this.dataChange.value;
   }
 
   constructor(public http: HttpClient, private testService : TestServiceService) {
     this.initialize();
   }
 
   initialize() {
     // Build the tree nodes from Json object. The result is a list of `TodoItemNode` with nested
     //     file node as children.

     this.http.get(this.backend_url + '/documentTree/' + localStorage.getItem("currentUserId")).subscribe(message => { 
        // Notify the change.
        this.id = JSON.parse(JSON.stringify(message)).ID
        this.rootNode = <TodoItemNode>{ id: "root", name: "root", children: JSON.parse(JSON.stringify(message)).documents };
        this.dataChange.next([this.rootNode]);
      })
   }
 
   /** Add an item to to-do list */
   insertItem(parent: TodoItemNode, vName: string) {
     console.log(parent.id)
     const child = <TodoItemNode>{ id: uuid.v4(), name: vName };
     if (parent.children) {
       // parent already has children
       parent.children.push(child);
       this.dataChange.next(this.data);
     } else {
       // if parent is a leaf node
       parent.children = [];
       parent.children.push(child);
       this.dataChange.next(this.data);
     }
   }
 
   updateItem(node: TodoItemNode, vName: string) {
    node.name = vName;
    node.children = null;
    this.dataChange.next(this.data);

    this.testService.post("saveDocumentTree", 
      { 
        "ID": this.id,
        "userId": localStorage.getItem("currentUserId"),
        "documents": JSON.parse(JSON.stringify(this.rootNode.children))
      }
    ).subscribe(message => { 
      console.log(message)
      this.testService.post("saveDocument", 
      { 
        "ID": node.id,
        "parentId": "",
        "userId": localStorage.getItem("currentUserId"),
        "title": vName,
        "content": "new document"
      }).subscribe(message => { console.log(message) })
    })
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
    return _nodeData.level === 0;
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
    flatNode.level = level;
    flatNode.expandable = !!node.children;
    this.flatNodeMap.set(flatNode, node);
    this.nestedNodeMap.set(node, flatNode);
    return flatNode;
  };

  /** Select the category so we can insert the new item. */
  addNewItem(node: TodoItemFlatNode) {
    const parentNode = this.flatNodeMap.get(node);
    let isParentHasChildren: boolean = false;
    if (parentNode.children) isParentHasChildren = true;
    this.database.insertItem(parentNode!, '');

    this.treeControl.expand(node);
    this.treeControl.collapse(this.nestedNodeMap.get(this.database.rootNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.rootNode));
  }

  removeItem(node: TodoItemFlatNode) {
    
  }

  /** Save the node to database */
  saveNode(node: TodoItemFlatNode, itemValue: string) {
    const nestedNode = this.flatNodeMap.get(node);
    this.database.updateItem(nestedNode!, itemValue);
    this.treeControl.collapse(this.nestedNodeMap.get(this.database.rootNode));
    this.treeControl.expand(this.nestedNodeMap.get(this.database.rootNode));
  }

  removeNode(node: TodoItemFlatNode) {
  }

  onMenuToggle(): void {
    this.showSidebar = !this.showSidebar;
  }
}
