const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();

app.use(cors());
app.use(bodyParser.json());

let reminders = []; // Array untuk menyimpan jadwal pengingat

// Membuat instance klien WhatsApp
const whatsappClient = new Client({
    authStrategy: new LocalAuth(), // Menyimpan sesi secara lokal
});

// Menampilkan QR code untuk login
whatsappClient.on('qr', (qr) => {
    console.log('QR code untuk login:');
    qrcode.generate(qr, { small: true });
});

// Saat klien siap digunakan
whatsappClient.on('ready', () => {
    console.log('Bot WhatsApp siap digunakan dan terhubung ke akun WhatsApp.');
});

// CRUD REMINDER

// CREATE - Endpoint untuk menambahkan pengingat
app.post('/schedule-reminder', (req, res) => {
    try {
        const { phoneNumber, paymentDate, reminderTime, message } = req.body;

        // Validasi input
        if (!phoneNumber || !paymentDate || !reminderTime || !message) {
            return res.status(400).json({ message: 'Data tidak lengkap!' });
        }

        const reminderDateTime = new Date(`${paymentDate}T${reminderTime}`);
        if (isNaN(reminderDateTime)) {
            return res.status(400).json({ message: 'Format tanggal atau waktu salah!' });
        }

        // Buat pengingat dengan ID unik
        const reminder = {
            id: Date.now(), // Gunakan timestamp sebagai ID unik
            phoneNumber,
            reminderDateTime,
            message, // Simpan pesan kustom
        };

        // Tambahkan pengingat ke array
        reminders.push(reminder);

        res.json({ message: 'Pengingat pembayaran berhasil dijadwalkan!', reminder });
    } catch (error) {
        console.error('Error pada backend:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server!' });
    }
});

// READ - Endpoint untuk mendapatkan daftar pengingat yang terdaftar
app.get('/get-reminders', (req, res) => {
    try {
        res.json({ reminders });
    } catch (error) {
        console.error('Error mendapatkan pengingat:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat mendapatkan daftar pengingat!' });
    }
});

// UPDATE - Endpoint untuk memperbarui pengingat berdasarkan ID
app.put('/update-reminder/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { phoneNumber, paymentDate, reminderTime, message } = req.body;

        // Cari pengingat berdasarkan ID
        const reminderIndex = reminders.findIndex((reminder) => reminder.id === parseInt(id));
        if (reminderIndex === -1) {
            return res.status(404).json({ message: 'Pengingat tidak ditemukan!' });
        }

        const reminderDateTime = new Date(`${paymentDate}T${reminderTime}`);
        if (isNaN(reminderDateTime)) {
            return res.status(400).json({ message: 'Format tanggal atau waktu salah!' });
        }

        // Update data pengingat
        reminders[reminderIndex] = {
            ...reminders[reminderIndex],
            phoneNumber,
            reminderDateTime,
            message, // Update pesan kustom
        };

        res.json({ message: 'Pengingat berhasil diperbarui!', reminder: reminders[reminderIndex] });
    } catch (error) {
        console.error('Error memperbarui pengingat:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat memperbarui pengingat!' });
    }
});

// DELETE - Endpoint untuk menghapus pengingat berdasarkan ID
app.delete('/delete-reminder/:id', (req, res) => {
    try {
        const { id } = req.params;

        // Filter out pengingat yang sesuai dengan ID
        const initialLength = reminders.length;
        reminders = reminders.filter((reminder) => reminder.id !== parseInt(id));

        if (reminders.length === initialLength) {
            return res.status(404).json({ message: 'Pengingat tidak ditemukan!' });
        }

        res.json({ message: 'Pengingat berhasil dihapus!' });
    } catch (error) {
        console.error('Error menghapus pengingat:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat menghapus pengingat!' });
    }
});

// Fungsi untuk mengirim pesan ke WhatsApp menggunakan whatsapp-web.js
const sendWhatsAppMessage = async (phoneNumber, message) => {
    try {
        const chatId = `${phoneNumber}@c.us`; // Format nomor telepon yang benar
        await whatsappClient.sendMessage(chatId, message);
        console.log(`Pesan berhasil dikirim ke ${phoneNumber}`);
    } catch (error) {
        console.error('Gagal mengirim pesan:', error);
        throw error; // Lempar kesalahan agar pengingat tidak dihapus jika gagal mengirim
    }
};

// Cron job untuk mengecek pengingat dan mengirim pesan
cron.schedule('* * * * *', () => {
    const now = new Date();
    reminders = reminders.filter((reminder) => {
        if (now >= reminder.reminderDateTime) {
            sendWhatsAppMessage(reminder.phoneNumber, reminder.message)
                .then(() => {
                    console.log(`Pesan dikirim ke ${reminder.phoneNumber}, pengingat dihapus.`);
                })
                .catch((error) => {
                    console.error('Gagal mengirim pesan:', error);
                    return true; // Jangan hapus pengingat jika gagal mengirim
                });
            return false; // Hapus pengingat setelah pesan dikirim
        }
        return true; // Pertahankan pengingat jika belum waktunya
    });
});

// Handle 404 untuk endpoint yang tidak ditemukan
app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint tidak ditemukan' });
});

// Menjalankan server
app.listen(3000, () => {
    console.log('Server berjalan di port 3000');
});

// Menginisialisasi klien WhatsApp
whatsappClient.initialize();
