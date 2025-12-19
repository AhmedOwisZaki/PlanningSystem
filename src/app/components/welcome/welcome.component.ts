import { Component, ViewEncapsulation, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-welcome',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './welcome.component.html',
    styleUrl: './welcome.component.scss',
    encapsulation: ViewEncapsulation.None
})
export class WelcomeComponent {
    isSignInOpen = signal(false);
    isSignUpOpen = signal(false);
    isLoading = signal(false);
    errorMessage = signal<string | null>(null);

    // Sign In Data
    email = '';
    password = '';

    // Sign Up Data
    signupFirstName = '';
    signupLastName = '';
    signupUsername = '';
    signupEmail = '';
    signupPassword = '';
    signupConfirmPassword = '';

    constructor(
        private router: Router,
        private apiService: ApiService,
        private authService: AuthService
    ) { }

    openSignIn() {
        this.closeSignUp();
        this.isSignInOpen.set(true);
    }

    closeSignIn() {
        this.isSignInOpen.set(false);
        this.email = '';
        this.password = '';
        this.errorMessage.set(null);
    }

    openSignUp() {
        this.closeSignIn();
        this.isSignUpOpen.set(true);
    }

    closeSignUp() {
        this.isSignUpOpen.set(false);
        this.signupFirstName = '';
        this.signupLastName = '';
        this.signupUsername = '';
        this.signupEmail = '';
        this.signupPassword = '';
        this.signupConfirmPassword = '';
        this.errorMessage.set(null);
    }

    onSignIn() {
        if (!this.email || !this.password) {
            this.errorMessage.set('Please enter email and password');
            return;
        }

        this.isLoading.set(true);
        this.errorMessage.set(null);

        const credentials = {
            Email: this.email,
            Password: this.password
        };

        this.apiService.login(credentials).subscribe({
            next: (response) => {
                this.isLoading.set(false);
                // The backend returns a ResponseDto with the token inside the Model property
                const token = response?.model?.token || response?.Model?.Token || response?.token || response?.Token;

                if (token) {
                    console.log('Token found and being saved:', token.substring(0, 10) + '...');
                    this.authService.setToken(token);
                    this.router.navigate(['/projects']);
                } else {
                    console.error('Login response missing token:', response);
                    this.errorMessage.set('Login successful but no token received. Please contact support.');
                }
            },
            error: (error) => {
                this.isLoading.set(false);
                this.errorMessage.set(error.message || 'Login failed. Please check your credentials.');
            }
        });
    }

    onSignUp() {
        if (!this.signupFirstName || !this.signupLastName || !this.signupUsername || !this.signupEmail || !this.signupPassword) {
            this.errorMessage.set('All fields are required');
            return;
        }

        if (this.signupPassword !== this.signupConfirmPassword) {
            this.errorMessage.set('Passwords do not match');
            return;
        }

        this.isLoading.set(true);
        this.errorMessage.set(null);

        const userData = {
            FirstName: this.signupFirstName,
            LastName: this.signupLastName,
            UserName: this.signupUsername,
            Email: this.signupEmail,
            Password: this.signupPassword
        };

        this.apiService.register(userData).subscribe({
            next: (response) => {
                this.isLoading.set(false);
                alert('Registration successful. Please sign in.');
                this.closeSignUp();
                this.openSignIn();
            },
            error: (error) => {
                this.isLoading.set(false);
                this.errorMessage.set(error.message || 'Registration failed. Please try again.');
            }
        });
    }

    // Legacy method maintained for compatibility but updated to use modal
    signup() {
        this.openSignUp();
    }
}
