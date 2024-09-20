function reminderApp() {
  return {
    reminders: [], // Data untuk menyimpan semua pengingat
    form: {
      // Form model untuk create/update pengingat
      id: null,
      phoneNumber: "",
      paymentDate: "",
      reminderTime: "",
      message: "",
    },
    // Fungsi untuk mengambil data pengingat dari backend
    fetchReminders() {
      fetch("http://localhost:3000/get-reminders")
        .then((response) => response.json())
        .then((data) => {
          this.reminders = data.reminders;
        })
        .catch((error) => console.error("Error fetching reminders:", error));
    },
    // Fungsi untuk menambahkan/memperbarui pengingat
    saveReminder() {
      const method = this.form.id ? "PUT" : "POST";
      const url = this.form.id
        ? `http://localhost:3000/update-reminder/${this.form.id}`
        : "http://localhost:3000/schedule-reminder";

      fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: this.form.phoneNumber,
          paymentDate: this.form.paymentDate,
          reminderTime: this.form.reminderTime,
          message: this.form.message,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          this.fetchReminders();
          this.resetForm();
        })
        .catch((error) => console.error("Error saving reminder:", error));
    },
    // Fungsi untuk menghapus pengingat
    deleteReminder(id) {
      fetch(`http://localhost:3000/delete-reminder/${id}`, { method: "DELETE" })
        .then((response) => response.json())
        .then((data) => {
          this.fetchReminders();
        })
        .catch((error) => console.error("Error deleting reminder:", error));
    },
    // Fungsi untuk mengisi form dengan data pengingat saat mengedit
    editReminder(reminder) {
      this.form.id = reminder.id;
      this.form.phoneNumber = reminder.phoneNumber;
      this.form.paymentDate = new Date(reminder.reminderDateTime)
        .toISOString()
        .split("T")[0];
      this.form.reminderTime = new Date(reminder.reminderDateTime)
        .toTimeString()
        .split(" ")[0];
      this.form.message = reminder.message;
    },
    // Fungsi untuk mereset form setelah submit atau cancel
    resetForm() {
      this.form.id = null;
      this.form.phoneNumber = "";
      this.form.paymentDate = "";
      this.form.reminderTime = "";
      this.form.message = "";
    },
    // Inisialisasi aplikasi dengan mengambil pengingat
    init() {
      this.fetchReminders();
    },
  };
}
