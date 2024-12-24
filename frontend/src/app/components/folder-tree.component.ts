import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { Observable, of as observableOf } from 'rxjs';
import { FlatTreeControl } from '@angular/cdk/tree';
import { DataService } from '../data.service';

/** File node data with nested structure. */
export interface FileNode {
  name: string;
  type: string;
  children?: FileNode[];
  path: string;
  highlighted: boolean
}

/** Flat node with expandable and level information */
export interface TreeNode {
  name: string;
  type: string;
  level: number;
  expandable: boolean;
  path: string;
  highlighted: boolean
}

@Component({
  selector: 'app-folder-tree',
  template: `
    <div class="tree-container">
      <div class="tree-header">
        <mat-icon class="header-icon pulse">{{ headline === 'Current Structure' ? 'folder_open' : 'auto_fix_high' }}</mat-icon>
        <h3>{{ headline }}</h3>
      </div>
      <mat-tree [dataSource]="dataSource" [treeControl]="treeControl">
        <mat-tree-node *matTreeNodeDef="let node" matTreeNodePadding class="fade-in">
          <button mat-icon-button disabled></button>
          <mat-icon class="type-icon" [class.highlight]="isSelected(node)">{{ getNodeIcon(node) }}</mat-icon>
          <span class="node-name" [class.selected]="isSelected(node)" (click)="selectNode(node)">
            {{ node.name }}
          </span>
        </mat-tree-node>

        <mat-tree-node *matTreeNodeDef="let node; when: hasChild" matTreeNodePadding class="fade-in">
          <button mat-icon-button [attr.aria-label]="'Toggle ' + node.name" matTreeNodeToggle>
            <mat-icon class="folder-icon">
              {{ treeControl.isExpanded(node) ? 'folder_open' : 'folder' }}
            </mat-icon>
          </button>
          <span class="node-name" [class.selected]="isSelected(node)" (click)="selectNode(node)">
            {{ node.name }}
          </span>
          <mat-icon *ngIf="index < 2" matTooltip="Show folder in the other Tree" (click)="notifyParent(node)" class="action-icon">
            {{ index === 0 ? 'arrow_downward' : 'arrow_upward' }}
          </mat-icon>
        </mat-tree-node>
      </mat-tree>
    </div>
  `,
  styles: [`
    .tree-container {
      padding: 16px;
    }

    .tree-header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      gap: 12px;
    }

    .header-icon {
      color: var(--primary);
      font-size: 24px;
    }

    .pulse {
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.1);
        opacity: 0.8;
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }

    .fade-in {
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .type-icon {
      margin-right: 8px;
      font-size: 20px;
      transition: all 0.3s ease;
    }

    .type-icon.highlight {
      color: var(--primary);
      transform: scale(1.2);
    }

    .node-name {
      cursor: pointer;
      padding: 2px 8px;
      border-radius: 4px;
      transition: all 0.2s ease;
      flex-grow: 1;
    }

    .node-name:hover {
      background: var(--hover-bg);
    }

    .node-name.selected {
      background: var(--primary-light);
      color: var(--primary);
      font-weight: 500;
    }

    .folder-icon {
      font-size: 20px;
      color: var(--primary);
      transition: transform 0.3s ease;
    }

    button[matTreeNodeToggle]:hover .folder-icon {
      transform: scale(1.1);
    }

    .action-icon {
      opacity: 0;
      transition: all 0.2s ease;
      color: var(--primary);
      margin-left: 8px;
      cursor: pointer;
    }

    mat-tree-node:hover .action-icon {
      opacity: 1;
    }

    .action-icon:hover {
      transform: scale(1.2);
    }

    ::ng-deep .mat-tree-node {
      min-height: 26px !important;
    }

    ::ng-deep .mat-tree {
      margin-left: -12px;
    }

    ::ng-deep .mat-tree-node .mat-tree-node {
      margin-left: 24px;
    }

    ::ng-deep .mat-icon-button {
      width: 28px;
      height: 28px;
      line-height: 28px;
      margin-right: 4px;
    }

    ::ng-deep .mat-tree {
      background: transparent;
    }
  `]
})

export class FolderTreeComponent implements OnInit {

  /** The TreeControl controls the expand/collapse state of tree nodes.  */
  treeControl: FlatTreeControl<TreeNode>;

  /** The TreeFlattener is used to generate the flat list of items from hierarchical data. */
  treeFlattener: MatTreeFlattener<FileNode, TreeNode>;

  /** The MatTreeFlatDataSource connects the control and flattener to provide data. */
  dataSource: MatTreeFlatDataSource<FileNode, TreeNode>;

  @Input() paths: string[] = [];
  @Input() headline: string = "";
  @Input() rootPath: string = "";
  @Input() index: number = 0;
  @Output() notify = new EventEmitter<any>();

  sep = "/";
  isWin = navigator.userAgent.toLowerCase().includes('win')

  constructor(private dataService: DataService) {
    this.treeFlattener = new MatTreeFlattener(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren
    );
    this.treeControl = new FlatTreeControl<TreeNode>(this.getLevel, this.isExpandable);
    this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
  }

  ngOnInit(): void {
    this.dataSource.data = this.transformPathsToTree(this.paths)
    this.expandRootNodes();
  }

  expandRootNodes(): void {
    const levels = this.rootPath.split(this.sep).filter(part => part !== '').length;
    for (let i = 0; i < levels; i++) {
      const currentNodes = this.treeControl.dataNodes.filter(node => node.level === i);
      currentNodes.forEach(node => this.treeControl.expand(node));
    }
  }

  transformPathsToTree(paths: string[]): FileNode[] {
    const root: FileNode = { name: '', type: 'Folder', children: [], path: "", highlighted: false };

    paths.forEach(path => {
      const parts = path.split(this.sep);
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if(part === '') continue;
        const isFile = i === parts.length - 1;
        const type = isFile ? 'file' : 'Folder';
        let node = current.children?.find(child => child.name === part && child.type === type);
        if (!node) {
          const new_path = current.path === "" && this.isWin ? parts[i] : current.path + "/" + parts[i]
          node = isFile ? { name: part, type: type, path: new_path, highlighted: current.highlighted } : { name: part, type: type, children: [], path: new_path, highlighted: current.highlighted };
          current.children?.push(node);
        }

        if (!isFile) {
          current = node;
        }
      }
    });
    return root.children!
  }

  /** Transform the data to something the tree can read. */
  transformer(node: FileNode, level: number) {
    return {
      name: node.name,
      type: node.type,
      level: level,
      expandable: !!node.children,
      path: node.path,
      highlighted: false
    };
  }

  /** Get the level of the node */
  getLevel(node: TreeNode) {
    return node.level;
  }

  /** Return whether the node is expanded or not. */
  isExpandable(node: TreeNode) {
    return node.expandable;
  };

  /** Get the children for the node. */
  getChildren(node: FileNode): Observable<FileNode[]> {
    return observableOf(node.children ?? []);
  }

  /** Get whether the node has children or not. */
  hasChild(index: number, node: TreeNode) {
    return node.expandable;
  }

  onFileOpenClick(node: TreeNode): void {
    const fullPath = node.path;
    this.dataService.openFile(fullPath).subscribe((data) => { console.log(data) });
  }

  expandNodeByPath(path: string): void {
    const parts = path.split(this.sep).filter(part => part !== '')
    let prefixPath = ""
    parts.forEach(part => {
      prefixPath = prefixPath === "" && this.isWin ? part : prefixPath + this.sep + part
      const node = this.findNodeByPath(prefixPath);
      if (node) {
        this.treeControl.expand(node);
        node.highlighted = true; // Add this line to highlight the node
      }
    })
  }

  findNodeByPath(path: string): TreeNode | null {
    const nodes = this.treeControl.dataNodes;
    let searchedNode = null
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].path === path) {
        searchedNode = nodes[i];
      } else {
        nodes[i].highlighted = false;
      }
    }
    return searchedNode;
  }

  highlightFile(path: string): void {
    this.expandNodeByPath(path);
  }

  notifyParent(node: any): void {
    const nodes = this.treeControl.dataNodes;
    for (let i = 0; i < nodes.length; i++) nodes[i].highlighted = false;
    this.notify.emit({ 'index': this.index, 'path': node.path });
  }

  getNodeIcon(node: TreeNode): string {
    if (node.type === 'file') {
      const extension = node.name.split('.').pop()?.toLowerCase();
      switch (extension) {
        case 'jpg':
        case 'jpeg':
        case 'png':
          return 'image';
        case 'pdf':
          return 'picture_as_pdf';
        case 'xlsx':
        case 'xls':
          return 'table_chart';
        default:
          return 'description';
      }
    }
    return 'folder';
  }

  isSelected(node: TreeNode): boolean {
    return node.highlighted;
  }

  selectNode(node: TreeNode): void {
    const nodes = this.treeControl.dataNodes;
    for (let i = 0; i < nodes.length; i++) nodes[i].highlighted = false;
    node.highlighted = true;
  }
}
