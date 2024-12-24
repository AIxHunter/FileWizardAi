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
        <div class="header-content">
          <h1>Welcome to FileWizard AI</h1>
          <p class="subtitle">Intelligent file management at your fingertips</p>
          <a class="github-link" href="https://github.com/AIxHunter/FileWizardAI/tree/main" target="_blank">
            <div class="github-icons">
              <svg class="github-logo" height="24" viewBox="0 0 16 16" width="24">
                <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
              </svg>
              <span>View on GitHub</span>
              <mat-icon class="arrow">arrow_forward</mat-icon>
            </div>
          </a>
        </div>
        <div class="header-background"></div>
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
            <div class="structure-panel">
              <app-folder-tree [paths]="srcPaths" 
                             [rootPath]="rootPath"
                             [headline]="'Current Structure'"
                             [index]=0 
                             (notify)="onNotify($event)">
              </app-folder-tree>
            </div>

            <div class="structure-panel">
              <app-folder-tree [paths]="dstPaths" 
                             [rootPath]="rootPath"
                             [headline]="'Optimized Structure'"
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
      animation: fadeIn 0.5s ease;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .header {
      text-align: center;
      margin-bottom: 4rem;
      padding: 4rem 2rem;
      position: relative;
      overflow: hidden;
      background: linear-gradient(180deg, 
        rgba(0, 191, 165, 0.03) 0%,
        rgba(100, 255, 218, 0.02) 100%
      );
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .header-content {
      position: relative;
      z-index: 2;
      max-width: 800px;
      margin: 0 auto;
    }

    .header-background {
      position: absolute;
      top: -50%;
      left: -50%;
      right: -50%;
      bottom: -50%;
      background: 
        radial-gradient(circle at 20% 30%, rgba(0, 191, 165, 0.03) 0%, transparent 70%),
        radial-gradient(circle at 80% 70%, rgba(100, 255, 218, 0.03) 0%, transparent 70%);
      transform-origin: center;
      animation: gentleRotate 30s linear infinite;
      z-index: 1;
      filter: blur(30px);
    }

    .header h1 {
      font-size: 4rem;
      font-weight: 700;
      margin: 0;
      background: linear-gradient(135deg, 
        rgba(0, 191, 165, 1) 0%,
        rgba(100, 255, 218, 1) 50%,
        rgba(0, 191, 165, 1) 100%
      );
      background-size: 200% auto;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.02em;
      line-height: 1.1;
      animation: shimmerText 8s linear infinite;
      text-shadow: 0 2px 10px rgba(0, 191, 165, 0.2);
    }

    .subtitle {
      color: var(--text-secondary);
      font-size: 1.3rem;
      margin-top: 1.5rem;
      font-weight: 400;
      letter-spacing: 0.02em;
      opacity: 0.9;
      animation: fadeInUp 0.8s ease 0.2s both;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .github-link {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      color: var(--text-primary);
      text-decoration: none;
      margin-top: 2.5rem;
      padding: 0.75rem 1.75rem;
      border-radius: 50px;
      background: rgba(0, 191, 165, 0.1);
      border: 1px solid rgba(0, 191, 165, 0.2);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      animation: fadeInUp 0.8s ease 0.4s both;
      font-weight: 500;
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(5px);

      .github-icons {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .github-logo {
        color: var(--primary);
        transition: all 0.3s ease;
        animation: floatIcon 6s ease-in-out infinite;
      }

      span {
        font-size: 0.95rem;
        letter-spacing: 0.02em;
      }

      .arrow {
        font-size: 18px;
        transition: all 0.3s ease;
        opacity: 0;
        transform: translateX(-10px);
        color: var(--primary);
        margin-left: 4px;
      }

      &:hover {
        color: var(--primary);
        background: rgba(0, 191, 165, 0.15);
        border-color: rgba(0, 191, 165, 0.5);
        transform: translateY(-2px);
        padding-right: 2.25rem;
        box-shadow: 
          0 4px 20px rgba(0, 191, 165, 0.2),
          0 0 0 2px rgba(0, 191, 165, 0.1);

        &::before {
          animation: shimmer 1s forwards;
        }

        .github-logo {
          transform: scale(1.1);
          filter: drop-shadow(0 0 8px rgba(0, 191, 165, 0.5));
        }

        .arrow {
          opacity: 1;
          transform: translateX(0);
        }
      }
    }

    @keyframes gentleRotate {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes shimmerText {
      to {
        background-position: 200% center;
      }
    }

    @keyframes floatIcon {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-3px);
      }
    }

    @keyframes shimmer {
      to {
        transform: translateX(100%);
      }
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
      padding: 2rem;
      border: 1px solid var(--border);
      height: fit-content;
      transition: transform 0.3s ease, box-shadow 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
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
      padding: 0.75rem 1rem;
      cursor: pointer;
      border-radius: var(--radius-sm);
      transition: all 0.3s ease;

      .group-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex: 1;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
          color: var(--primary);
          transition: transform 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: gentleFloat 6s ease-in-out infinite;
        }

        span {
          font-size: 0.9rem;
          color: var(--text-primary);
          line-height: 20px;
        }
      }

      &:hover {
        background: rgba(var(--primary-rgb), 0.05);
        transform: translateX(4px);

        .group-info mat-icon {
          transform: scale(1.1);
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
        animation: expandContent 0.3s ease;
      }
    }

    @keyframes expandContent {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
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
      transition: all 0.3s ease;
      position: relative;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

        mat-icon {
          transform: rotate(180deg);
        }
      }

      mat-icon {
        transition: transform 0.3s ease;
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

    .structure-panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 1rem;
      margin-top: 1rem;
      min-height: 200px;
      max-height: 500px;
      overflow-y: auto;
    }

    .structure-panel h3 {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      font-weight: 500;
      color: var(--text-primary);
      border-bottom: 2px solid var(--primary);
      padding-bottom: 0.5rem;
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
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
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

    @keyframes gentleFloat {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-2px);
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
