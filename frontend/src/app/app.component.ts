import { Component, HostBinding, Input, QueryList, ViewChildren } from '@angular/core';
import { DataService } from './data.service';
import { HttpParams } from "@angular/common/http";
import { FolderTreeComponent } from './components/folder-tree.component';
import { NgModel } from '@angular/forms';

interface ExtensionGroup {
  name: string;
  icon: string;
  extensions: string[];
  selected: number;
  total: number;
  expanded: boolean;
}

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container">
      <div class="header">
        <h1>Welcome to FileWizard AI</h1>
        <p class="subtitle">Intelligent file management at your fingertips</p>
      </div>

      <div class="content">
        <div class="main-section">
          <div class="section-header">
            <div class="icon-title">
              <mat-icon>folder_open</mat-icon>
              <div>
                <h2>File Structure Manager</h2>
                <p>Configure and organize your files intelligently</p>
              </div>
            </div>
          </div>

          <div class="input-section">
            <mat-form-field appearance="outline" class="root-path-field">
              <mat-label>Root Path</mat-label>
              <input matInput [(ngModel)]="rootPath" (ngModelChange)="onPathChange($event)" placeholder="Click the folder icon to select a directory">
              <mat-icon matSuffix>folder_open</mat-icon>
            </mat-form-field>
          </div>

          <div class="extensions-section">
            <div class="extensions-header">
              <h3>File Extensions</h3>
              <div class="extension-actions">
                <button mat-button color="primary" (click)="selectAll()">
                  <mat-icon>select_all</mat-icon>
                  Select All
                </button>
                <button mat-button color="warn" (click)="clearAll()">
                  <mat-icon>clear_all</mat-icon>
                  Clear
                </button>
              </div>
            </div>

            <div class="extension-groups">
              <div *ngFor="let group of extensionGroups" class="extension-group">
                <div class="group-header" (click)="toggleGroup(group)">
                  <div class="group-info">
                    <mat-icon>{{group.icon}}</mat-icon>
                    <span>{{group.name}}</span>
                  </div>
                  <div class="group-count">
                    {{group.selected}}/{{group.total}}
                    <mat-icon class="expand-icon" [class.expanded]="group.expanded">expand_more</mat-icon>
                  </div>
                </div>
                <div class="group-content" [class.expanded]="group.expanded">
                  <mat-checkbox *ngFor="let ext of group.extensions"
                              [checked]="isExtensionSelected(ext)"
                              (change)="toggleExtension(ext, group)"
                              color="primary">
                    {{ext}}
                  </mat-checkbox>
                </div>
              </div>
            </div>
          </div>

          <div class="actions-section">
            <mat-checkbox [(ngModel)]="isRecursive" color="primary" class="subdirectories-check">
              Include Subdirectories
            </mat-checkbox>
            
            <button mat-flat-button color="primary" (click)="getFiles()" class="get-files-btn">
              <mat-icon>search</mat-icon>
              GET FILES
            </button>
          </div>
        </div>

        <div class="search-section">
          <div class="section-header">
            <div class="icon-title">
              <mat-icon>search</mat-icon>
              <div>
                <h2>File Search</h2>
                <p>Search and locate files in your directory</p>
              </div>
            </div>
          </div>

          <app-search-files [rootPath]="rootPath" 
                           [isRecursive]="isRecursive" 
                           [filesExts]="filesExts">
          </app-search-files>
        </div>
      </div>

      <!-- Results Section -->
      <div *ngIf="isLoading || srcPaths" class="results-section">
        <div class="loading-overlay" *ngIf="isLoading">
          <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
          <p>Processing files...</p>
        </div>

        <div class="trees-container" *ngIf="srcPaths">
          <div class="tree-view">
            <h3>Current Structure</h3>
            <app-folder-tree [paths]="srcPaths" 
                           [rootPath]="rootPath" 
                           [index]=0 
                           (notify)="onNotify($event)">
            </app-folder-tree>
          </div>

          <div class="tree-view">
            <h3>Optimized Structure</h3>
            <app-folder-tree [paths]="dstPaths" 
                           [rootPath]="rootPath" 
                           [index]=1 
                           (notify)="onNotify($event)">
            </app-folder-tree>
          </div>
        </div>

        <div class="update-section" *ngIf="original_files">
          <button mat-flat-button color="primary" (click)="updateStructure()">
            <mat-icon>auto_fix_high</mat-icon>
            Update Structure
          </button>

          <div class="messages">
            <div *ngIf="successMessage" class="success-message">
              <mat-icon>check_circle</mat-icon>
              {{successMessage}}
            </div>
            <div *ngIf="errorMessage" class="error-message">
              <mat-icon>error</mat-icon>
              {{errorMessage}}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background-color: #ffffff;
      color: #333333;
      font-family: 'Roboto', sans-serif;
    }

    .app-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .header {
      text-align: center;
      margin-bottom: 3rem;
    }

    .header h1 {
      font-size: 2.5rem;
      font-weight: 500;
      color: #00BFA5;
      margin: 0;
    }

    .subtitle {
      color: #666666;
      font-size: 1.1rem;
      margin-top: 0.5rem;
    }

    .content {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 2rem;
    }

    .main-section, .search-section {
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      padding: 2rem;
    }

    .section-header {
      margin-bottom: 2rem;
    }

    .icon-title {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }

    .icon-title mat-icon {
      color: #00BFA5;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .icon-title h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 500;
      color: #333333;
    }

    .icon-title p {
      margin: 0.25rem 0 0 0;
      color: #666666;
      font-size: 0.9rem;
    }

    .input-section {
      margin-bottom: 2rem;
    }

    .root-path-field {
      width: 100%;
    }

    .extensions-section {
      margin-bottom: 2rem;
    }

    .extensions-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .extensions-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 500;
      color: #333333;
    }

    .extension-actions {
      display: flex;
      gap: 0.5rem;
    }

    .extension-groups {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }

    .extension-group {
      border-bottom: 1px solid #e0e0e0;
    }

    .extension-group:last-child {
      border-bottom: none;
    }

    .group-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .group-header:hover {
      background-color: #f5f5f5;
    }

    .group-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .group-info mat-icon {
      color: #00BFA5;
    }

    .group-count {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #00BFA5;
      font-size: 0.9rem;
    }

    .expand-icon {
      transition: transform 0.2s;
    }

    .expand-icon.expanded {
      transform: rotate(180deg);
    }

    .group-content {
      display: none;
      padding: 1rem;
      background-color: #f9f9f9;
    }

    .group-content.expanded {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 1rem;
    }

    .actions-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 2rem;
    }

    .get-files-btn {
      background-color: #00BFA5;
      color: white;
      padding: 0 2rem;
    }

    .results-section {
      margin-top: 2rem;
      position: relative;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      z-index: 10;
    }

    .trees-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }

    .tree-view {
      background: #f9f9f9;
      border-radius: 8px;
      padding: 1.5rem;
    }

    .tree-view h3 {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      font-weight: 500;
      color: #333333;
    }

    .update-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: 2rem;
      gap: 1rem;
    }

    .messages {
      width: 100%;
      max-width: 500px;
    }

    .success-message, .error-message {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      border-radius: 4px;
      margin-top: 0.5rem;
    }

    .success-message {
      background-color: #E8F5E9;
      color: #2E7D32;
    }

    .error-message {
      background-color: #FFEBEE;
      color: #C62828;
    }

    /* Material Overrides */
    ::ng-deep {
      .mat-form-field-appearance-outline .mat-form-field-outline {
        color: #e0e0e0;
      }

      .mat-form-field-appearance-outline.mat-focused .mat-form-field-outline-thick {
        color: #00BFA5;
      }

      .mat-form-field-label {
        color: #666666;
      }

      .mat-checkbox-checked.mat-primary .mat-checkbox-background {
        background-color: #00BFA5;
      }

      .mat-button.mat-primary {
        color: #00BFA5;
      }
    }

    @media (max-width: 1024px) {
      .content {
        grid-template-columns: 1fr;
      }

      .trees-container {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .app-container {
        padding: 1rem;
      }

      .header h1 {
        font-size: 2rem;
      }

      .actions-section {
        flex-direction: column;
        gap: 1rem;
      }

      .get-files-btn {
        width: 100%;
      }
    }
  `]
})
export class AppComponent {

  @ViewChildren(FolderTreeComponent) childComponents!: QueryList<FolderTreeComponent>;

  extensionGroups: ExtensionGroup[] = [
    {
      name: 'Documents',
      icon: 'description',
      extensions: ['.pdf', '.doc', '.docx', '.txt', '.md'],
      selected: 0,
      total: 5,
      expanded: false
    },
    {
      name: 'Images',
      icon: 'image',
      extensions: ['.jpg', '.jpeg', '.png', '.gif', '.svg'],
      selected: 0,
      total: 5,
      expanded: false
    },
    {
      name: 'Audio',
      icon: 'audiotrack',
      extensions: ['.mp3', '.wav', '.ogg', '.m4a', '.flac'],
      selected: 0,
      total: 5,
      expanded: false
    },
    {
      name: 'Video',
      icon: 'movie',
      extensions: ['.mp4', '.avi', '.mkv', '.mov', '.wmv'],
      selected: 0,
      total: 5,
      expanded: false
    },
    {
      name: 'Archives',
      icon: 'folder_zip',
      extensions: ['.zip', '.rar', '.7z', '.tar', '.gz'],
      selected: 0,
      total: 5,
      expanded: false
    },
    {
      name: 'Code',
      icon: 'code',
      extensions: ['.js', '.ts', '.py', '.java', '.html', '.css', '.json', '.php', '.cpp'],
      selected: 0,
      total: 9,
      expanded: false
    },
    {
      name: 'Data',
      icon: 'storage',
      extensions: ['.csv', '.xlsx', '.xml', '.sql', '.db', '.json'],
      selected: 0,
      total: 6,
      expanded: false
    }
  ];

  original_files: any;
  srcPaths: any;
  dstPaths: any;
  rootPath: string = "";
  isRecursive: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;
  filesExts: string[] = [];

  constructor(private dataService: DataService) {
    this.updateSelectedCounts();
  }

  toggleGroup(group: ExtensionGroup) {
    group.expanded = !group.expanded;
  }

  updateSelectedCounts() {
    this.extensionGroups.forEach(group => {
      group.selected = group.extensions.filter(ext => this.filesExts.includes(ext)).length;
    });
  }

  selectAll() {
    this.filesExts = this.extensionGroups.flatMap(group => group.extensions);
    this.updateSelectedCounts();
  }

  clearAll() {
    this.filesExts = [];
    this.updateSelectedCounts();
  }

  isExtensionSelected(ext: string): boolean {
    return this.filesExts.includes(ext);
  }

  toggleExtension(ext: string, group: ExtensionGroup) {
    const index = this.filesExts.indexOf(ext);
    if (index === -1) {
      this.filesExts.push(ext);
    } else {
      this.filesExts.splice(index, 1);
    }
    group.selected = group.extensions.filter(ext => this.filesExts.includes(ext)).length;
  }

  onPathChange(value: string) {
    this.rootPath = value.replaceAll("\\\\", "/").replaceAll("\\", "/")
  }

  getFiles(): void {
    this.srcPaths = null;
    this.dstPaths = null;
    this.isLoading = true;
    let params = new HttpParams();
    params = params.set("root_path", this.rootPath)
    params = params.set("recursive", this.isRecursive)
    params = params.set("required_exts", this.filesExts.join(';'))
    this.dataService.getFormattedFiles(params).subscribe((data) => {
      this.original_files = data
      this.original_files.items = this.original_files.items.map((item: any) => ({ src_path: item.src_path.replaceAll("\\\\", "/").replaceAll("\\", "/"), dst_path: item.dst_path }))
      let res = this.original_files.items.map((item: any) => ({ src_path: `${data.root_path}/${item.src_path}`, dst_path: `${data.root_path}/${item.dst_path}` }))
      this.srcPaths = res.map((r: any) => r.src_path);
      this.dstPaths = res.map((r: any) => r.dst_path);
      this.isLoading = false;
    })
  }

  updateStructure(): void {
    this.dataService.updateStructure(this.original_files).subscribe(data => {
      this.successMessage = 'Files re-structured successfully.';
    },
      (error) => {
        console.error(error);
        this.errorMessage = 'An error occurred while moving data.';
      });
  }

  onNotify(value: any): void {
    const index = 1 - value.index; // call the other tree: 0 -> 1, 1 -> 0
    const path = value.path; // get dst ot src path
    const root_path = this.original_files.root_path;
    let matchingFilePath = "";
    if (value.index === 0)
      matchingFilePath = root_path + "/" + this.original_files.items.find((file: any) => root_path + "/" + file.src_path === path)?.dst_path;
    else
      matchingFilePath = root_path + "/" + this.original_files.items.find((file: any) => root_path + "/" + file.dst_path === path)?.src_path;
    this.childComponents.toArray()[index].highlightFile(matchingFilePath);
  }
}
