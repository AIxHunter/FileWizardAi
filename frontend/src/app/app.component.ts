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
      <button class="theme-toggle" (click)="toggleTheme()">
        <mat-icon>{{ isDarkTheme ? 'light_mode' : 'dark_mode' }}</mat-icon>
        {{ isDarkTheme ? 'Light' : 'Dark' }} Mode
      </button>

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

          <div class="trees-container" *ngIf="srcPaths">
            <div class="current-structure">
              <h3>Current Structure</h3>
              <app-folder-tree [paths]="srcPaths" 
                             [rootPath]="rootPath" 
                             [index]=0 
                             (notify)="onNotify($event)">
              </app-folder-tree>
            </div>

            <div class="optimized-structure">
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

      <!-- Removed Results Section -->
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background-color: var(--background);
      color: var(--text-primary);
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
      color: var(--primary);
      margin: 0;
    }

    .subtitle {
      color: var(--text-secondary);
      font-size: 1.1rem;
      margin-top: 0.5rem;
    }

    .content {
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .main-section, .search-section {
      background: var(--surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      padding: 2rem;
      border: 1px solid var(--border);
      height: fit-content;
    }

    .section-header {
      margin-bottom: 2rem;
    }

    .icon-title {
      display: flex;
      align-items: center;
      gap: 1rem;

      mat-icon {
        font-size: 2rem;
        width: 2rem;
        height: 2rem;
        color: var(--primary);
        animation: gentleFloat 6s ease-in-out infinite;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
      }

      &:hover mat-icon {
        animation: elegantPulse 2s ease-in-out infinite;
      }
    }

    .icon-title h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 500;
      color: var(--text-primary);
    }

    .icon-title p {
      margin: 0.25rem 0 0 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .input-section {
      margin-bottom: 2rem;
    }

    .root-path-field {
      width: 100%;
      color: var(--text-primary);
    }

    .root-path-field input {
      color: var(--text-primary);
    }

    .search-text {
      color: var(--text-primary);
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
      color: var(--text-primary);
    }

    .extension-actions {
      display: flex;
      gap: 0.5rem;
    }

    .extension-groups {
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
    }

    .extension-group {
      border-bottom: 1px solid var(--border);
      margin-bottom: 1rem;

      &:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }
    }

    .group-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem;
      cursor: pointer;
      border-radius: var(--radius-sm);
      transition: background-color 0.2s ease;
      position: relative;
      overflow: hidden;

      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(var(--primary-rgb), 0.1),
          transparent
        );
        transform: translateX(-100%);
        transition: transform 0.5s ease;
      }

      &:hover::after {
        transform: translateX(100%);
      }

      .group-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        mat-icon {
          color: var(--primary);
          animation: gentleFloat 8s ease-in-out infinite;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        }
      }

      &:hover .group-info mat-icon {
        animation: elegantPulse 1.5s ease-in-out infinite;
      }

      .group-count {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 48px;
        height: 24px;
        padding: 0 8px;
        border-radius: 12px;
        font-size: 0.875rem;
        font-weight: 500;
        letter-spacing: 0.5px;
        background: linear-gradient(135deg, var(--surface-variant), var(--surface));
        border: 1px solid var(--border);
        color: var(--text-secondary);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            135deg,
            transparent,
            rgba(var(--primary-rgb), 0.1),
            transparent
          );
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border-color: var(--primary);
          color: var(--primary);

          &::before {
            opacity: 1;
            animation: shimmerEffect 2s infinite;
          }
        }
      }

      @keyframes shimmerEffect {
        0% {
          transform: translateX(-100%);
        }
        50%, 100% {
          transform: translateX(100%);
        }
      }

      .group-info {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 0.75rem;

        mat-icon {
          color: var(--primary);
          transition: all 0.3s ease;
        }

        span {
          font-weight: 500;
          color: var(--text-primary);
          transition: color 0.3s ease;
        }
      }

      &:hover {
        .group-info {
          mat-icon {
            transform: scale(1.1);
          }
          span {
            color: var(--primary);
          }
        }

        .group-count {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
      }
    }

    .group-content {
      display: none;
      padding: 0.5rem;
      gap: 0.5rem;
      flex-wrap: wrap;

      &.expanded {
        display: flex;
        animation: slideDown 0.3s ease;
      }

      mat-checkbox {
        margin: 0.25rem;
        transition: transform 0.2s ease;

        &:hover {
          transform: translateX(4px);
        }
      }
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes gentleFloat {
      0%, 100% {
        transform: translate(0, 0);
      }
      25% {
        transform: translate(2px, -2px);
      }
      50% {
        transform: translate(0, -3px);
      }
      75% {
        transform: translate(-2px, -2px);
      }
    }

    @keyframes elegantPulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.03);
        opacity: 0.9;
      }
    }

    @keyframes smoothRotate {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes shimmer {
      0% {
        background-position: -100% 0;
      }
      100% {
        background-position: 100% 0;
      }
    }

    @keyframes glowPulse {
      0%, 100% {
        filter: drop-shadow(0 0 2px var(--primary));
      }
      50% {
        filter: drop-shadow(0 0 8px var(--primary));
      }
    }

    .actions-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 2rem;
    }

    .get-files-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.2),
          transparent
        );
        transform: translateX(-100%);
      }

      &:hover::before {
        transform: translateX(100%);
        transition: transform 0.8s ease;
      }

      mat-icon {
        animation: gentleFloat 5s ease-in-out infinite;
      }

      &:hover mat-icon {
        animation: glowPulse 1.5s ease-in-out infinite;
      }
    }

    .current-structure, .optimized-structure {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 1rem;
      margin-top: 1rem;
      min-height: 200px;
      max-height: 500px;
      overflow-y: auto;
    }

    .current-structure h3, .optimized-structure h3 {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      font-weight: 500;
      color: var(--text-primary);
      border-bottom: 2px solid var(--primary);
      padding-bottom: 0.5rem;
    }

    .trees-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      margin-top: 2rem;
    }

    .update-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: 2rem;
      gap: 1rem;
    }

    .update-section button {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      position: relative;
      overflow: hidden;

      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.2),
          transparent
        );
        transform: translateX(-100%);
      }

      &:hover::after {
        transform: translateX(100%);
        transition: transform 0.8s ease;
      }

      mat-icon {
        animation: gentleFloat 7s ease-in-out infinite;
      }

      &:hover mat-icon {
        animation: smoothRotate 3s linear infinite;
      }
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
      border-radius: var(--radius-sm);
      margin-top: 0.5rem;
      position: relative;
      overflow: hidden;
    }

    .success-message {
      background: rgba(46, 125, 50, 0.1);

      mat-icon {
        animation: elegantPulse 3s ease-in-out infinite;
      }

      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(46, 125, 50, 0.1),
          transparent
        );
        animation: shimmer 2s infinite;
        background-size: 200% 100%;
      }
    }

    .error-message {
      background: rgba(198, 40, 40, 0.1);

      mat-icon {
        animation: gentleFloat 4s ease-in-out infinite;
      }

      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(211, 47, 47, 0.1),
          transparent
        );
        animation: shimmer 2s infinite;
        background-size: 200% 100%;
      }
    }

    /* Material Overrides */
    ::ng-deep {
      .mat-form-field-appearance-outline .mat-form-field-outline {
        color: var(--border);
      }

      .mat-form-field-appearance-outline.mat-focused .mat-form-field-outline-thick {
        color: var(--primary);
      }

      .mat-form-field-label {
        color: var(--text-secondary);
      }

      .mat-checkbox-checked.mat-primary .mat-checkbox-background {
        background-color: var(--primary);
      }

      .mat-button.mat-primary {
        color: var(--primary);
      }
    }

    /* Theme Variables */
    :root {
      --background: #ffffff;
      --background-rgb: 255, 255, 255;
      --surface: #f9f9f9;
      --surface-variant: #f5f5f5;
      --primary: #00BFA5;
      --text-primary: #333333;
      --text-secondary: #666666;
      --border: #e0e0e0;
      --radius-lg: 12px;
      --radius-sm: 4px;
      --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.05);
      --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.1);
      --hover: #f0f0f0;
    }

    :root[data-theme="dark"] {
      --background: #333333;
      --background-rgb: 51, 51, 51;
      --surface: #444444;
      --surface-variant: #555555;
      --primary: #00BFA5;
      --text-primary: #ffffff;
      --text-secondary: #cccccc;
      --border: #666666;
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
  isDarkTheme = false;

  constructor(private dataService: DataService) {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.isDarkTheme = true;
      document.documentElement.setAttribute('data-theme', 'dark');
    }
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

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    document.documentElement.setAttribute('data-theme', this.isDarkTheme ? 'dark' : 'light');
    localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
  }
}
