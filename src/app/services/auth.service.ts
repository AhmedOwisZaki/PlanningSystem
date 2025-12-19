import { Injectable, signal, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private tokenKey = 'auth_token';
    private userSubject = new BehaviorSubject<any>(null);
    public user$ = this.userSubject.asObservable();

    constructor(
        private router: Router,
        @Inject(PLATFORM_ID) private platformId: Object
    ) {
        this.loadStoredUser();
    }

    private loadStoredUser() {
        if (isPlatformBrowser(this.platformId)) {
            const token = localStorage.getItem(this.tokenKey);
            if (token) {
                // Ideally decode JWT here to get user info
                this.userSubject.next({ token });
            }
        }
    }

    setToken(token: string) {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem(this.tokenKey, token);
            this.userSubject.next({ token });
        }
    }

    getToken(): string | null {
        if (isPlatformBrowser(this.platformId)) {
            return localStorage.getItem(this.tokenKey);
        }
        return null;
    }

    logout() {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem(this.tokenKey);
        }
        this.userSubject.next(null);
        this.router.navigate(['/welcome']);
    }

    isAuthenticated(): boolean {
        if (isPlatformBrowser(this.platformId)) {
            return !!localStorage.getItem(this.tokenKey);
        }
        return false;
    }
}

