# 🔫 2D Multiplayer Shooter Game (Top-down) – "Eagle Arena"

Một web game bắn súng 2D góc nhìn top-down nhiều người chơi online, được xây dựng bằng HTML, CSS, JavaScript, Socket.IO và Node.js.  
Tích hợp hệ thống xác thực người dùng hiện đại với OTP, bảo mật cao, UX mượt như ngân hàng.

---

## 🚀 Chức năng nổi bật

- ✅ Đăng ký tài khoản kèm xác minh OTP qua email
- ✅ Đăng nhập + giao diện chuyển động mượt
- ✅ Quên mật khẩu (có gửi lại OTP + đổi pass mới)
- ✅ Game online top-down với Socket.IO realtime
- ✅ Leaderboard xếp hạng 5 người top đầu
- ✅ Chặn dùng lại mật khẩu cũ, check độ mạnh mật khẩu
- ✅ Resend OTP, hiệu ứng game over, máu bắn tung tóe 😆
- ✅ Tách server theo module (auth/game), chuẩn backend dev

---

## 🧠 Công nghệ sử dụng

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Node.js, Express.js
- Realtime: Socket.IO
- Database: MongoDB (Atlas)
- Email OTP: Nodemailer
- Bảo mật: bcrypt + .env

---

## 🛠️ Cài đặt

```bash
# Clone project
git clone [https://github.com/your-username/awesome-multiplayer-game.git](https://github.com/duclam2011dz/awesome-multiplayer-game.git)
cd awesome-multiplayer-game

# Cài đặt dependencies
npm install

# Tạo file .env
touch .env
# hoặc nếu dùng Windows
echo > .env
