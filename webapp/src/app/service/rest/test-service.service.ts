import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders  } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { retry } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TestServiceService {

  backend_url = environment.apiUrl;

  token:any;

  constructor(public http: HttpClient) {
    this.token ="";
  }

  public _addStandardHeaders(header:HttpHeaders){
    header = header.append('Content-Type','application/json');
    header = header.append('Accept','application/json');
    
    return header;
  }

  get(endpoint: string, params?: any, reqOpts?: any) {
    if (!reqOpts) {
      reqOpts = {
        headers: this._addStandardHeaders(new HttpHeaders()),
        params: new HttpParams(),
      };
    }

    if (params) {
      reqOpts.params = new HttpParams();
      for (let k in params) {
        reqOpts.params = reqOpts.params.set(k, params[k]);
      }
    }

    return this.http.get(this.backend_url + '/' + endpoint, reqOpts).pipe(retry(3));
  }

  post(endpoint: string, body: any, reqOpts?: any) {
    return this.http.post<any>(this.backend_url + '/' + endpoint, body, reqOpts).pipe(retry(3));
  }

  put(endpoint: string, body: any, reqOpts?: any) {
    return this.http.put(this.backend_url + '/' + endpoint, body, reqOpts).pipe(retry(3));
  }

  delete(endpoint: string, reqOpts?: any) {
    return this.http.delete(this.backend_url + '/' + endpoint, reqOpts).pipe(retry(3));
  }
}