import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { BasicRestService } from 'src/app/service/basic-rest.service';
import { Auth } from 'aws-amplify';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Clipboard } from '@angular/cdk/clipboard';
import { HostListener } from '@angular/core';
import { LlmDialogService } from 'src/app/service/llm-dialog.service';
import { ConfigDialogService } from 'src/app/service/config-dialog-service';
import {
  DocumentFlatNode,
  DocumentNode,
  DocumentTree,
  PINNED_ID,
  ROOT_ID,
  TRASH_ID,
} from 'src/app/service/document-tree-service';

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss'],
  providers: [DocumentTree, LlmDialogService, ConfigDialogService],
})
export class SidenavComponent implements OnInit, AfterViewInit {
  username: string;

  initContent: string;

  showSidebar = true;

  darkmode: boolean;

  dragging = false;
  expandTimeout: any;
  expandDelay = 1000;

  isMobileDevice = false;

  operatingSystem: string;

  showZettelkasten = false;

  @ViewChild('searchInput') searchInput: ElementRef;

  constructor(
    private documentTree: DocumentTree,
    private basicRestService: BasicRestService,
    private router: Router,
    private llmDialogService: LlmDialogService,
    private configDialogService: ConfigDialogService,
    private clipboard: Clipboard,
  ) {
    this.getScreenSize();
    this.setOperatingSystem();

    if (environment.production) {
      Auth.currentAuthenticatedUser().then((user) => {
        Auth.userAttributes(user).then((attributes) => {
          const darkmodeAttribute = attributes.find(
            (attribute) => attribute.Name === `custom:darkmode`,
          );
          this.darkmode = darkmodeAttribute.Value === '1';
          localStorage.setItem('darkmode', this.darkmode.toString());
          this.setTheme();
        });
      });
    } else {
      if (localStorage.getItem('darkmode') !== null) {
        this.darkmode = localStorage.getItem('darkmode') === 'true';
        this.setTheme();
      }
    }

    if (this.router.url === '/notebox') {
      this.showZettelkasten = true;
    } else {
      this.showZettelkasten = false;
    }
  }

  setOperatingSystem() {
    const userAgent = navigator.userAgent;

    let operatingSystem = '';
    if (/Windows/i.test(userAgent)) {
      operatingSystem = 'Windows';
    } else if (/Macintosh|Mac OS/i.test(userAgent)) {
      operatingSystem = 'Mac';
    } else if (/Linux/i.test(userAgent)) {
      operatingSystem = 'Linux';
    } else if (/Android/i.test(userAgent)) {
      operatingSystem = 'Android';
    } else if (/iOS|iPhone|iPad|iPod/i.test(userAgent)) {
      operatingSystem = 'iOS';
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
  focusSearchInput(event) {
    event.preventDefault();
    this.searchInput.nativeElement.value = '';
    this.openSearchDialog();
  }

  @HostListener('document:keydown.escape', ['$event'])
  closeDialogs() {
    document.getElementById('searchDialog').style.display = 'none';
    this.searchInput.nativeElement.value = '';
    this.llmDialogService.closeDialog();
    this.configDialogService.closeDialog();
  }

  ngAfterViewInit(): void {
    this.autocomplete(
      document.getElementById('search_documents'),
      this.basicRestService,
      this.router,
    );
  }

  ngOnInit(): void {
    this.username = localStorage.getItem('username');

    // check if opened on mobile browser, to prevent drag and drop
    this.isMobileDevice =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(
        navigator.userAgent,
      );
  }

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

  openItem(el: HTMLElement, id: string) {
    this.showZettelkasten = false;
    if (el.tagName === 'SPAN') el = el.parentElement;
    if (el.tagName === 'MAT-TREE-NODE') {
      const elems = document.querySelectorAll('.active');
      [].forEach.call(elems, function (el: HTMLElement) {
        el.classList.remove('active');
      });
      el.classList.add('active');

      this.basicRestService.get('document/' + id).subscribe((result) => {
        const document = JSON.parse(JSON.stringify(result));
        this.documentTree.initContentChange.next({
          id: document.id,
          title: document.title,
          content: document.content,
          isPublic: document.isPublic,
        });
      });
    }
  }

  addNewItem(node: DocumentFlatNode) {
    this.showSidebar = true;
    this.documentTree.addNewItem(node);
    document.getElementById('new_document').focus();
  }

  editItem(node: DocumentFlatNode) {
    node.editNode = true;
    this.documentTree.refreshTree();
    document.getElementById('edit_document_title').focus();
  }

  cancelEditItem(node: DocumentFlatNode) {
    node.editNode = false;
    this.documentTree.refreshTree();
  }

  deleteEmptyItem(node: DocumentFlatNode) {
    this.documentTree.deleteEmptyItem(node);
  }

  moveToTrash(node: DocumentFlatNode) {
    this.documentTree.moveToTrash(node);
  }

  removeFromTrash(node: DocumentFlatNode) {
    if (
      confirm('Are you sure you want to permanently delete ' + node.name + '?')
    ) {
      this.documentTree.removeFromTrash(node);
    }
  }

  saveItem(node: DocumentFlatNode, itemValue: string, newItem: boolean) {
    this.documentTree.saveItem(node!, itemValue, newItem);
  }

  restoreItem(node: DocumentFlatNode) {
    this.documentTree.restoreItem(node);
  }

  pinItem(node: DocumentFlatNode) {
    this.documentTree.pinItem(node);
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

    let visibleNodes = this.visibleNodes(
      event.item.data.parent === PINNED_ID,
      event.item.data.deleted,
    );

    const currentIndexOfDraggedNode = visibleNodes.findIndex(
      (v) => v.id === draggedNode.id,
    );

    let dropIndex = event.currentIndex;

    const pinnedNodes = this.documentTree.pinnedNode.children
      ? this.documentTree.pinnedNode.children.length
      : 0;
    const pinnedExpanded = this.treeControl.isExpanded(
      this.nestedNodeMap.get(this.documentTree.pinnedNode),
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
        this.treeControl.isExpanded(
          this.nestedNodeMap.get(this.documentTree.pinnedNode),
        )
      ) {
        dropIndex -= pinnedNodes;
      }
      if (
        this.treeControl.isExpanded(
          this.nestedNodeMap.get(this.documentTree.rootNode),
        )
      ) {
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

  /*
    find all visible nodes regardless of the level, except the dragged node, and return it as a flat list
  */
  visibleNodes(inPinned: boolean, deleted: boolean): DocumentNode[] {
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

  addExpandedChildren(
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

  rebuildTreeForData(data: any) {
    this.dataSource.data = data;
    this.refreshTree();
    this.basicRestService
      .post('saveDocumentTree', {
        id: localStorage.getItem('currentUserId'),
        documents: JSON.parse(
          JSON.stringify(this.documentTree.rootNode.children),
        ),
        trash: JSON.parse(JSON.stringify(this.documentTree.trashNode.children)),
        pinned: JSON.parse(
          JSON.stringify(this.documentTree.pinnedNode.children),
        ),
      })
      .subscribe();
  }

  autocomplete(input: any, testService: BasicRestService, router: Router) {
    /*the autocomplete function takes two arguments,
    the text field element and an array of possible autocompleted values:*/
    let currentFocus;
    /*execute a function when someone writes in the text field:*/
    input.addEventListener('input', async function () {
      let a,
        b,
        i,
        val = this.value;
      /*close any already open lists of autocompleted values*/
      closeAllLists(null);
      if (!val) {
        return false;
      }
      if (val.length > 2) {
        currentFocus = -1;
        /*create a DIV element that will contain the items (values):*/
        a = document.createElement('DIV');
        a.setAttribute('id', this.id + 'autocomplete-list');
        a.setAttribute('class', 'autocomplete-items');
        /*append the DIV element as a child of the autocomplete container:*/
        this.parentNode.appendChild(a);
        const result = await testService
          .get(
            'search-documents/' +
              localStorage.getItem('currentUserId') +
              '?searchString=' +
              this.value,
          )
          .toPromise();
        const foundElements = JSON.parse(JSON.stringify(result));
        /*for each item in the array...*/
        for (i = 0; i < foundElements.length; i++) {
          /*create a DIV element for each matching element:*/
          b = document.createElement('DIV');
          b.setAttribute('class', 'search-item');
          b.innerHTML +=
            "<strong style='font-size:18px;'>" +
            foundElements[i].title +
            '</strong></br>';
          const suggestion = suggestionToDisplay(foundElements[i].content, val);
          /*make the matching letters bold:*/
          const startIndex = suggestion
            .toLocaleLowerCase()
            .indexOf(val.toLocaleLowerCase());
          if (startIndex > -1) {
            b.innerHTML += suggestion.substring(0, startIndex);
            b.innerHTML += '<strong>' + val + '</strong>';
            b.innerHTML += suggestion.substring(startIndex + val.length);
          } else {
            b.innerHTML += suggestion;
          }
          /*insert a input field that will hold the current array item's value:*/
          b.innerHTML +=
            "<input type='hidden' value='" + foundElements[i].id + "'>";
          /*execute a function when someone clicks on the item value (DIV element):*/
          b.addEventListener('click', function (e) {
            router.navigate(
              ['/' + this.getElementsByTagName('input')[0].value],
              { relativeTo: this.route },
            );
            document.getElementById('searchDialog').style.display = 'none';
            input.value = '';
            closeAllLists(null);
          });
          a.appendChild(b);
        }
      }
    });
    /*execute a function presses a key on the keyboard:*/
    input.addEventListener('keydown', function (e) {
      const x = document.getElementById(this.id + 'autocomplete-list');
      if (x) var suggestionList = x.getElementsByTagName('div');
      if (e.keyCode == 40) {
        /*If the arrow DOWN key is pressed,
        increase the currentFocus variable:*/
        if (currentFocus == suggestionList.length - 1) return;
        currentFocus++;
        /*and and make the current item more visible:*/
        addActive(suggestionList);
        if (!isElementVisible(x, suggestionList[currentFocus])) {
          x.scrollTop += suggestionList[currentFocus].offsetHeight;
        }
      } else if (e.keyCode == 38) {
        //up
        /*If the arrow UP key is pressed,
        decrease the currentFocus variable:*/
        if (currentFocus == 0) return;
        currentFocus--;
        /*and and make the current item more visible:*/
        addActive(suggestionList);
        if (!isElementVisible(x, suggestionList[currentFocus])) {
          x.scrollTop -= suggestionList[currentFocus].offsetHeight;
        }
      } else if (e.keyCode == 13) {
        /*If the ENTER key is pressed, prevent the form from being submitted,*/
        e.preventDefault();
        if (currentFocus > -1) {
          /*and simulate a click on the "active" item:*/
          if (suggestionList) suggestionList[currentFocus].click();
        }
      }
    });
    function isElementVisible(container, element) {
      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      return (
        elementRect.top >= containerRect.top &&
        elementRect.bottom <= containerRect.bottom
      );
    }
    function addActive(x: any) {
      /*a function to classify an item as "active":*/
      if (!x) return false;
      /*start by removing the "active" class on all items:*/
      removeActive(x);
      if (currentFocus >= x.length) currentFocus = 0;
      if (currentFocus < 0) currentFocus = x.length - 1;
      /*add class "autocomplete-active":*/
      x[currentFocus].classList.add('autocomplete-active');
    }
    function removeActive(x: any) {
      /*a function to remove the "active" class from all autocomplete items:*/
      for (let i = 0; i < x.length; i++) {
        x[i].classList.remove('autocomplete-active');
      }
    }
    function closeAllLists(elmnt: any) {
      /*close all autocomplete lists in the document,
      except the one passed as an argument:*/
      const x = document.getElementsByClassName('autocomplete-items');
      for (let i = 0; i < x.length; i++) {
        if (elmnt != x[i] && elmnt != input) {
          x[i].parentNode.removeChild(x[i]);
        }
      }
    }
    function suggestionToDisplay(
      content: string,
      searchPattern: string,
    ): string {
      const offset = content.length - searchPattern.length;
      const startOffset = content
        .toLocaleLowerCase()
        .indexOf(searchPattern.toLocaleLowerCase());
      const endOffset = offset - startOffset;
      const maxOffset = 48;
      const midOffset = 24;
      if (offset >= maxOffset && startOffset >= 0) {
        if (startOffset >= midOffset && endOffset >= midOffset) {
          return (
            '...' +
            content.substring(
              startOffset - midOffset,
              startOffset + searchPattern.length + midOffset,
            ) +
            '...'
          );
        }
        if (startOffset < midOffset) {
          return content.substring(0, searchPattern.length + maxOffset) + '...';
        }
        if (endOffset < midOffset) {
          return (
            '...' +
            content.substring(
              startOffset - maxOffset + endOffset,
              content.length,
            )
          );
        }
      } else if (startOffset === -1 && content.length > maxOffset) {
        return content.substring(0, maxOffset) + '...';
      } else {
        return content;
      }
    }
    /*execute a function when someone clicks in the document:*/
    document.addEventListener('click', function (e) {
      closeAllLists(e.target);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeAllLists(null);
      }
    });
  }

  toggleDarkMode() {
    this.darkmode = !this.darkmode;
    localStorage.setItem('darkmode', this.darkmode.toString());
    if (environment.production) {
      Auth.currentAuthenticatedUser().then((user) => {
        Auth.updateUserAttributes(user, {
          'custom:darkmode': this.darkmode ? '1' : '0',
        });
      });
    }
    this.setTheme();
  }

  setTheme() {
    document.documentElement.style.setProperty(
      '--background-color',
      this.darkmode
        ? 'var(--dark-theme-background-color)'
        : 'var(--light-theme-background-color)',
    );
    document.documentElement.style.setProperty(
      '--font-color',
      this.darkmode
        ? 'var(--dark-theme-font-color)'
        : 'var(--light-theme-font-color)',
    );
    document.documentElement.style.setProperty(
      '--menu-color',
      this.darkmode
        ? 'var(--dark-theme-menu-color)'
        : 'var(--light-theme-menu-color)',
    );
    document.documentElement.style.setProperty(
      '--button-fade',
      this.darkmode
        ? 'var(--dark-theme-button-fade)'
        : 'var(--light-theme-button-fade)',
    );
    document.documentElement.style.setProperty(
      '--hyperlink-color',
      this.darkmode
        ? 'var(--dark-theme-hyperlink-color)'
        : 'var(--light-theme-hyperlink-color)',
    );
  }

  openSearchDialog() {
    const overlay = document.getElementById('searchDialog');
    overlay.style.display = 'flex';
    if (overlay.getAttribute('outsideClickListener') !== 'true') {
      overlay.addEventListener('click', (event) => {
        overlay.setAttribute('outsideClickListener', 'true');
        this.outsideClickHandler(event);
      });
    }
    const searchField = document.getElementById('search_documents');
    searchField.focus();
  }

  outsideClickHandler(event: MouseEvent) {
    const overlay = document.getElementById('searchDialog');
    if (event.target === overlay) {
      overlay.style.display = 'none';
      this.searchInput.nativeElement.value = '';
    }
  }

  commandKey() {
    return this.operatingSystem === 'Mac' ? '⌘' : 'Ctrl';
  }

  openLlmDialog() {
    let config = localStorage.getItem('config');
    if (config) {
      config = JSON.parse(config);
    }
    if (!config || config['llm'] === '') {
      window.alert(
        'Please configure your LLM settings first. Click on the LLM config button in the user menu popup.',
      );
    } else {
      this.llmDialogService.openDialog();
    }
  }

  openConfigDialog() {
    this.configDialogService.openDialog();
  }

  openZettelkasten() {
    this.showZettelkasten = true;
    this.router.navigate(['/notebox']);
  }

  vimConfig() {
    const jsonObject = {
      apiUrl: environment.apiUrl,
      region: environment.awsRegion,
      domain: environment.domainName,
      clientId: environment.cognitoAppClientId,
    };
    const jsonString = JSON.stringify(jsonObject);
    const base64String = btoa(jsonString);

    this.clipboard.copy(base64String);
  }
}
