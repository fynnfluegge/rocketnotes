import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpParams, HttpHeaders  } from '@angular/common/http';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatTreeNestedDataSource } from '@angular/material/tree';

 interface Node {
  id: string;
  name: string;
  children?: Node[];
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit{
  treeControl = new NestedTreeControl<Node>(node => node.children);
  dataSource = new MatTreeNestedDataSource<Node>();
  showFiller = false

  backend_url: string =  "https://6o4c2p3kcg.execute-api.eu-central-1.amazonaws.com";

  constructor(private route: ActivatedRoute, public http: HttpClient){
  }

  hasChild = (_: number, node: Node) => !!node.children && node.children.length > 0;

  ngOnInit(): void {
    this.http.get(this.backend_url + '/documentTree/' + localStorage.getItem("currentUserId")).subscribe(message => { this.dataSource.data = JSON.parse(JSON.stringify(message)).documents })
  }
}
