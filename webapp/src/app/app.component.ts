import { Component, OnInit, Injectable } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { HttpClient, HttpParams, HttpHeaders  } from '@angular/common/http';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { of as ofObservable, Observable, BehaviorSubject } from 'rxjs';
import * as uuid from 'uuid';

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

   dataChange: BehaviorSubject<TodoItemNode[]> = new BehaviorSubject<TodoItemNode[]>([]);
 
   get data(): TodoItemNode[] {
     return this.dataChange.value;
   }
 
   constructor(public http: HttpClient) {
     this.initialize();
   }
 
   initialize() {
     // Build the tree nodes from Json object. The result is a list of `TodoItemNode` with nested
     //     file node as children.

     this.http.get(this.backend_url + '/documentTree/' + localStorage.getItem("currentUserId")).subscribe(message => { 
        // Notify the change.
        console.log(message);
        this.dataChange.next(JSON.parse(JSON.stringify(message)).documents);
      })
   }
 
   /** Add an item to to-do list */
   insertItem(parent: TodoItemNode, vName: string) {
     const child = <TodoItemNode>{ name: vName };
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

   insertRootItem() {
    const child = <TodoItemNode>{ id: uuid.v4(), name: "" };
    this.data.push(child);
    this.dataChange.next(this.data);
   }
 
   updateItem(node: TodoItemNode, vName: string) {
     node.name = vName;
     node.children = null;
     this.dataChange.next(this.data);
     console.log(JSON.stringify(this.data));
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
  flatNodeMap: Map<TodoItemFlatNode, TodoItemNode> = new Map<
    TodoItemFlatNode,
    TodoItemNode
  >();

  /** Map from nested node to flattened node. This helps us to keep the same object for selection */
  nestedNodeMap: Map<TodoItemNode, TodoItemFlatNode> = new Map<
    TodoItemNode,
    TodoItemFlatNode
  >();

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

  /** Whether all the descendants of the node are selected */
  descendantsAllSelected(node: TodoItemFlatNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    return descendants.every((child) =>
      this.checklistSelection.isSelected(child)
    );
  }

  /** Whether part of the descendants are selected */
  descendantsPartiallySelected(node: TodoItemFlatNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const result = descendants.some((child) =>
      this.checklistSelection.isSelected(child)
    );
    return result && !this.descendantsAllSelected(node);
  }

  /** Toggle the to-do item selection. Select/deselect all the descendants node */
  todoItemSelectionToggle(node: TodoItemFlatNode): void {
    this.checklistSelection.toggle(node);
    const descendants = this.treeControl.getDescendants(node);
    this.checklistSelection.isSelected(node)
      ? this.checklistSelection.select(...descendants)
      : this.checklistSelection.deselect(...descendants);
  }

  /** Select the category so we can insert the new item. */
  addNewItem(node: TodoItemFlatNode) {
    const parentNode = this.flatNodeMap.get(node);
    //
    let isParentHasChildren: boolean = false;
    if (parentNode.children) isParentHasChildren = true;
    //
    this.database.insertItem(parentNode!, '');
    // expand the subtree only if the parent has children (parent is not a leaf node)
    if (isParentHasChildren) this.treeControl.expand(node);
  }

  /** Save the node to database */
  saveNode(node: TodoItemFlatNode, itemValue: string) {
    const nestedNode = this.flatNodeMap.get(node);
    this.database.updateItem(nestedNode!, itemValue);
  }

  removeNode(node: TodoItemFlatNode) {
  }

  onAddNote(): void {
    this.database.insertRootItem();
  }

  onMenuToggle(): void {
    this.showSidebar = !this.showSidebar;
  }
}
