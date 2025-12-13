import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
    selector: 'app-welcome',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="welcome-container">
            <div class="overlay">
                <div class="content">
                    <h1>Construction Planning System</h1>
                    <p>Advanced Resource & Activity Management</p>
                    <div class="button-group">
                        <button class="btn-signin" (click)="enter()">Sign In</button>
                        <button class="btn-signup" (click)="signup()">Sign Up</button>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .welcome-container {
            width: 100vw;
            height: 100vh;
            background-image: url('/assets/images/welcome-bg.png');
            background-size: cover;
            background-position: center;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Segoe UI', sans-serif;
        }
        .overlay {
            background: rgba(0, 0, 0, 0.6);
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(2px);
        }
        .content {
            text-align: center;
            color: white;
            animation: fadeIn 1s ease-out;
        }
        h1 {
            font-size: 3.5rem;
            margin-bottom: 0.5rem;
            font-weight: 300;
            text-transform: uppercase;
            letter-spacing: 2px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }
        p {
            font-size: 1.2rem;
            margin-bottom: 3rem;
            color: #ccc;
            letter-spacing: 1px;
        }
        .button-group {
            display: flex;
            gap: 20px;
            justify-content: center;
        }
        button {
            padding: 15px 40px;
            font-size: 1.2rem;
            border: none;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .btn-signin {
            background: rgba(51, 154, 240, 0.9);
            color: white;
            box-shadow: 0 4px 15px rgba(51, 154, 240, 0.4);
        }
        .btn-signin:hover {
            background: #339af0;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(51, 154, 240, 0.6);
        } 
        .btn-signup {
            background: transparent;
            border: 2px solid rgba(255, 255, 255, 0.8);
            color: white;
        }
        .btn-signup:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: #fff;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 255, 255, 0.2);
        }
        button:active {
            transform: translateY(1px);
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `],
    encapsulation: ViewEncapsulation.None
})
export class WelcomeComponent {
    constructor(private router: Router) { }

    enter() {
        this.router.navigate(['/planning']);
    }

    signup() {
        this.router.navigate(['/planning']);
    }
}
