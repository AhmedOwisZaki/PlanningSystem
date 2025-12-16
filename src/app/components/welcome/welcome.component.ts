import { Component, ViewEncapsulation, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

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

    // Sign In Data
    username = '';
    password = '';

    // Sign Up Data
    signupUsername = '';
    signupEmail = '';
    signupPassword = '';
    signupConfirmPassword = '';

    constructor(private router: Router) { }

    openSignIn() {
        this.closeSignUp();
        this.isSignInOpen.set(true);
    }

    closeSignIn() {
        this.isSignInOpen.set(false);
        this.username = '';
        this.password = '';
    }

    openSignUp() {
        this.closeSignIn();
        this.isSignUpOpen.set(true);
    }

    closeSignUp() {
        this.isSignUpOpen.set(false);
        this.signupUsername = '';
        this.signupEmail = '';
        this.signupPassword = '';
        this.signupConfirmPassword = '';
    }

    onSignIn() {
        // Placeholder auth - proceed regardless of input for now
        this.router.navigate(['/planning']);
    }

    onSignUp() {
        // Placeholder registration logic
        this.router.navigate(['/planning']);
    }

    // Legacy method maintained for compatibility but updated to use modal
    signup() {
        this.openSignUp();
    }
}
