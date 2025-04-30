class AuthUI {
    constructor() {
        this.passwordInput = document.getElementById('register-password');
        this.strengthBar = document.getElementById('strength-bar');
        this.strengthText = document.getElementById('strength-text');

        this.addEvents();
    }

    showPopup(message, type = 'success') {
        const popup = document.getElementById('popup');
        const msg = document.getElementById('popup-message');
    
        // Hiển thị popup và blur nền
        popup.className = `popup show ${type}`;
        msg.textContent = message;
        document.body.classList.add('blur-active');
    
        setTimeout(() => {
            popup.classList.remove('show');
            document.body.classList.remove('blur-active');
        }, 3000);
    }

    addEvents() {
        document.getElementById('registerForm')?.addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleLogin(e));
        this.passwordInput?.addEventListener('input', () => this.updateStrengthMeter());
    }

    showRegister() {
        const login = document.getElementById('login-form');
        const register = document.getElementById('register-form');
        login.classList.add('slide-out');
        setTimeout(() => {
            login.classList.add('hidden');
            login.classList.remove('slide-out');
            register.classList.remove('hidden');
            register.classList.add('slide-in');
            setTimeout(() => register.classList.remove('slide-in'), 400);
        }, 400);
    }

    showLogin() {
        const login = document.getElementById('login-form');
        const register = document.getElementById('register-form');
        register.classList.add('slide-out');
        setTimeout(() => {
            register.classList.add('hidden');
            register.classList.remove('slide-out');
            login.classList.remove('hidden');
            login.classList.add('slide-in');
            setTimeout(() => login.classList.remove('slide-in'), 400);
        }, 400);
    }

    updateStrengthMeter() {
        const val = this.passwordInput.value;
        const strength = this.calculateStrength(val);
        this.strengthBar.style.width = strength + '%';
        this.strengthText.textContent = `Độ mạnh: ${strength}%`;

        if (strength < 30) this.strengthBar.style.background = 'red';
        else if (strength < 60) this.strengthBar.style.background = 'orange';
        else this.strengthBar.style.background = 'green';
    }

    calculateStrength(password) {
        let strength = 0;
        if (password.length >= 6) strength += 20;
        if (/[A-Z]/.test(password)) strength += 20;
        if (/[0-9]/.test(password)) strength += 20;
        if (/[\W]/.test(password)) strength += 20;
        if (password.length >= 10) strength += 20;
        return strength;
    }

    validateUsername(username) {
        const regex = /^[a-zA-Z0-9]{5,10}$/;
        return regex.test(username);
    }

    async handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('register-username').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = this.passwordInput.value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (!username || !email || !password || !confirmPassword) return this.showPopup('Bạn cần nhập đầy đủ thông tin.', 'error');
        if (!this.validateUsername(username)) return this.showPopup('Tên người dùng phải từ 5-10 ký tự, không dấu, không khoảng trắng!', 'error');
        if (this.calculateStrength(password) < 50) return this.showPopup('Mật khẩu chưa đủ mạnh!', 'error');
        if (password !== confirmPassword) return this.showPopup('Mật khẩu nhập lại không khớp.', 'error');

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await res.json();
            const isRedirect = !!data.redirect;
            this.showPopup(data.message, isRedirect ? 'success' : 'error');

            if (isRedirect) {
                localStorage.setItem('otpType', 'register');
                setTimeout(() => {
                    window.location.href = data.redirect;
                }, 1000);
            }
        } catch (err) {
            console.error(err);
            this.showPopup('Đã xảy ra lỗi kết nối.', 'error');
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (!username || !password) return this.showPopup('Bạn cần nhập đầy đủ thông tin.', 'error');

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            const isSuccess = data.message.toLowerCase().includes('thành công');
            this.showPopup(data.message, isSuccess ? 'success' : 'error');

            if (isSuccess) {
                setTimeout(() => {
                    window.location.href = '/menu';
                }, 1000); // đợi popup hiện xong rồi chuyển trang
            }
        } catch (err) {
            console.error(err);
            this.showPopup('Đã xảy ra lỗi kết nối.', 'error');
        }
    }
}

// Khởi tạo giao diện
const authUI = new AuthUI();

// Gắn global cho onclick bên HTML
function showRegister() { authUI.showRegister(); }
function showLogin() { authUI.showLogin(); }

function togglePassword(fieldId, eyeIcon) {
    const input = document.getElementById(fieldId);
    if (input.type === "password") {
        input.type = "text";
        eyeIcon.textContent = "🙈"; // đổi icon
    } else {
        input.type = "password";
        eyeIcon.textContent = "👁️"; // đổi icon
    }
}