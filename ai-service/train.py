import warnings

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.preprocessing import LabelEncoder
from sklearn.svm import LinearSVC

warnings.filterwarnings('ignore')


def train_model():
    print("=" * 80)
    print("Training intent classification model for NARA AC...")
    print("=" * 80)

    # Expanded and improved training data with all required intents
    # Each intent has varied phrasing to improve generalization
    data = [
        # greeting - Sapaan
        ("halo", "greeting"),
        ("selamat pagi", "greeting"),
        ("selamat siang", "greeting"),
        ("selamat sore", "greeting"),
        ("selamat malam", "greeting"),
        ("assalamualaikum", "greeting"),
        ("waalaikumsalam", "greeting"),
        ("hai", "greeting"),
        ("hi", "greeting"),
        ("helo", "greeting"),
        ("test", "greeting"),
        ("ping", "greeting"),
        ("ada yang bisa dibantu?", "greeting"),

        # tanya_layanan - Pertanyaan tentang layanan
        ("berapa harga cuci ac", "tanya_layanan"),
        ("info layanan", "tanya_layanan"),
        ("layanan apa saja yang ada", "tanya_layanan"),
        ("jenis layanan nara ac", "tanya_layanan"),
        ("apakah disini melayani cuci ac", "tanya_layanan"),
        ("layanan cuci ac", "tanya_layanan"),
        ("layanan servis ac", "tanya_layanan"),
        ("layanan perbaikan ac", "tanya_layanan"),
        ("apakah bisa bongkar pasang ac", "tanya_layanan"),
        ("layanan instalasi ac", "tanya_layanan"),
        ("ada layanan isi freon ga", "tanya_layanan"),
        (" info harga pasang ac", "tanya_layanan"),
        ("tarif ganti kapasitor ac", "tanya_layanan"),
        ("layanan cuci besar harganya berapa", "tanya_layanan"),
        ("area jangkauan service dimana saja?", "tanya_layanan"),
        ("lokasi bengkel dimana", "tanya_layanan"),
        ("apakah buka hari minggu", "tanya_layanan"),
        ("jual freon ga", "tanya_layanan"),
        ("terima perbaikan kulkas", "tanya_layanan"),
        ("ada garansi nggak kalau service disini?", "tanya_layanan"),
        ("pembayaran bisa pakai transfer?", "tanya_layanan"),

        # tanya_harga - Pertanyaan harga secara spesifik
        ("berapa harganya", "tanya_harga"),
        ("harga cuci ac berapa", "tanya_harga"),
        ("tarif servis ac", "tanya_harga"),
        ("berapa biaya cuci ac", "tanya_harga"),
        ("harga pasang ac", "tanya_harga"),
        ("berapa ongkos bongkar ac", "tanya_harga"),
        ("harga isi freon r32", "tanya_harga"),
        ("berapa mahal servis ac", "tanya_harga"),
        ("harga servis ac 1 pk", "tanya_harga"),
        ("berapa biaya pembersihan ac", "tanya_harga"),
        ("tarif perbaikan ac bocor", "tanya_harga"),
        ("harga ganti kompesor", "tanya_harga"),
        ("berapa untuk service rutin", "tanya_harga"),

        # keluhan_ac - Keluhan mengenai AC
        ("ac saya bocor", "keluhan_ac"),
        ("ac tidak dingin", "keluhan_ac"),
        ("ac kurang dingin", "keluhan_ac"),
        ("ac berisik", "keluhan_ac"),
        ("ac tidak mau nyala", "keluhan_ac"),
        ("ac netes air", "keluhan_ac"),
        ("ac meneteskan air", "keluhan_ac"),
        ("ac mengeluarkan bau", "keluhan_ac"),
        ("ac panas", "keluhan_ac"),
        ("ac rusak", "keluhan_ac"),
        ("ac mampet", "keluhan_ac"),
        ("ac mati total", "keluhan_ac"),
        ("ac nyala tapi tidak dingin", "keluhan_ac"),
        ("freon habis", "keluhan_ac"),
        ("ac bunyi berisik", "keluhan_ac"),

        # booking_service - Permintaan booking
        ("saya mau cuci ac", "booking_service"),
        ("pesan jasa perbaikan ac", "booking_service"),
        ("jadwalkan teknisi untuk besok", "booking_service"),
        ("ac saya bocor tolong diperbaiki, jadwalkan besok", "booking_service"),
        ("pasang ac baru", "booking_service"),
        ("mau servis rutin", "booking_service"),
        ("ac di kamar tidak dingin, bisa datang hari ini?", "booking_service"),
        ("pesan layanan maintenance", "booking_service"),
        ("butuh teknisi untuk bersihkan ac", "booking_service"),
        ("tolong cek ac saya rusak", "booking_service"),
        ("ingin memanggil tukang ac", "booking_service"),
        ("bisa booking untuk minggu depan?", "booking_service"),
        ("minta tolong benerin ac mampet", "booking_service"),
        ("saya mau pesan service ac", "booking_service"),
        ("bagaimana cara booking", "booking_service"),
        ("mau booking servis", "booking_service"),
        ("bisa datangkan teknisi?", "booking_service"),
        ("saya butuh service ac segera", "booking_service"),

        # ubah_jadwal - Perubahan jadwal
        ("saya mau ubah jadwal", "ubah_jadwal"),
        ("ganti jadwal booking", "ubah_jadwal"),
        ("jadwal digeser ke besok", "ubah_jadwal"),
        ("bisa dipindahkan jadwalnya", "ubah_jadwal"),
        ("ingin mengubah waktu service", "ubah_jadwal"),
        ("tolong ubah jadwal saya", "ubah_jadwal"),
        ("jadwal yang tadi pukul 10 bisa diganti pukul 14?", "ubah_jadwal"),
        ("saya mau undur jadwal", "ubah_jadwal"),
        ("bukan besok, hari jumat", "ubah_jadwal"),

        # batalkan_booking - Pembatalan booking
        ("saya mau batalkan booking", "batalkan_booking"),
        ("batalkan pesanan saya", "batalkan_booking"),
        ("saya mau cancel booking", "batalkan_booking"),
        ("tolong batalkan jadwal service", "batalkan_booking"),
        ("saya berubah pikiran, batalkan aja", "batalkan_booking"),
        ("cancel booking ac-1234", "batalkan_booking"),
        ("saya mau menghapus pesanan", "batalkan_booking"),

        # tanya_status - Pertanyaan status booking
        ("status pesanan saya", "tanya_status"),
        ("kapan teknisi datang", "tanya_status"),
        ("jam berapa teknisi sampai", "tanya_status"),
        ("apakah teknisi sudah jalan", "tanya_status"),
        ("cek jadwal service AC-1234", "tanya_status"),
        ("cek status AC-ABCD", "tanya_status"),
        ("saya mau tahu orderan saya sampai mana", "tanya_status"),
        ("teknisi atas nama budi sudah berangkat belum?", "tanya_status"),
        ("nomor booking saya BK-555, cek dong", "tanya_status"),
        ("kok teknisinya belum nyampe ya?", "tanya_status"),
        ("posisi tukang ac sekarang dimana?", "tanya_status"),
        ("booking saya statusnya apa", "tanya_status"),

        # tanya_pembayaran - Pertanyaan pembayaran
        ("berapa biaya servisnya", "tanya_pembayaran"),
        ("berapa total yang harus dibayar", "tanya_pembayaran"),
        ("pembayaran bisa pakai apa saja", "tanya_pembayaran"),
        ("apakah bisa bayar dengan transfer", "tanya_pembayaran"),
        ("cash on delivery bisa?", "tanya_pembayaran"),
        ("berapa uang muka untuk service", "tanya_pembayaran"),
        ("apakah harga sudah termasuk bahan", "tanya_pembayaran"),
        ("bagaimana cara pembayaran", "tanya_pembayaran"),
        ("bayar setelah selesai ya?", "tanya_pembayaran"),

        # tanya_teknisi - Pertanyaan tentang teknisi
        ("siapa teknisi yang akan datang", "tanya_teknisi"),
        ("teknisi yang menangani saya siapa", "tanya_teknisi"),
        ("kontak teknisi bisa dicek?", "tanya_teknisi"),
        ("apakah teknisi sudah berangkat", "tanya_teknisi"),
        ("teknisi akan datang jam berapa", "tanya_teknisi"),
        ("nomor hp teknisi", "tanya_teknisi"),
        ("siapa yang akan service ac saya", "tanya_teknisi"),

        # tanya_area_layanan - Cakupan wilayah layanan
        ("area layanan nara ac dimana saja", "tanya_area_layanan"),
        ("apakah melayani di daerah saya", "tanya_area_layanan"),
        ("wilayah jangkauan service", "tanya_area_layanan"),
        ("nara ac melayani di jaksel?", "tanya_area_layanan"),
        ("area coverage nara ac", "tanya_area_layanan"),
        ("apakah bisa datang ke bogor", "tanya_area_layanan"),
        ("daerah mana saja yang dilayani", "tanya_area_layanan"),

        # tanya_prosedur - Pertanyaan tentang prosedur
        ("bagaimana cara booking", "tanya_prosedur"),
        ("prosedur service ac", "tanya_prosedur"),
        ("langkah-langkah booking", "tanya_prosedur"),
        ("bagaimana alur layanan", "tanya_prosedur"),
        ("apa yang perlu disiapkan sebelum service", "tanya_prosedur"),
        ("berapa lama pengerjaan", "tanya_prosedur"),
        ("apakah perlu persiapan apa saja", "tanya_prosedur"),

        # follow_up - Respons lanjutan
        ("ya", "follow_up"),
        ("iya", "follow_up"),
        ("benar", "follow_up"),
        ("betul", "follow_up"),
        ("ok", "follow_up"),
        ("oke", "follow_up"),
        ("baikk", "follow_up"),
        ("terima kasih", "follow_up"),
        ("makasih", "follow_up"),
        ("sip", "follow_up"),

        # konfirmasi - Konfirmasi
        ("ya, saya mau booking", "konfirmasi"),
        ("saya setuju", "konfirmasi"),
        ("ok, lanjutkan", "konfirmasi"),
        ("saya konfirmasi", "konfirmasi"),
        ("ya, benar", "konfirmasi"),
        ("saya mau lanjut", "konfirmasi"),

        # penolakan - Penolakan
        ("tidak", "penolakan"),
        ("tidak mau", "penolakan"),
        ("gak mau", "penolakan"),
        ("batalin aja", "penolakan"),
        ("tidak jadi", "penolakan"),
        ("gak usah", "penolakan"),
        ("saya tidak mau", "penolakan"),

        # human_handoff - Meminta berbicara dengan admin
        ("saya mau bicara dengan admin", "human_handoff"),
        ("tolong hubungkan dengan admin", "human_handoff"),
        ("bicara dengan customer service", "human_handoff"),
        ("saya mau tanya ke admin", "human_handoff"),
        ("bisa hubungi admin?", "human_handoff"),
        ("saya mau komplain ke admin", "human_handoff"),

        # feedback - Masukan setelah layanan
        ("pelayanan bagus", "feedback"),
        ("sangat puas dengan layanan", "feedback"),
        ("teknisi kerjanya cepat", "feedback"),
        ("harga mahal", "feedback"),
        ("pelayanan lambat", "feedback"),
        ("rating 5", "feedback"),
        ("saya berikan 4 bintang", "feedback"),

        # admin_query - Query untuk admin (internal)
        ("berapa booking hari ini", "admin_query"),
        ("tampilkan laporan performa teknisi", "admin_query"),
        ("siapa teknisi yang kosong besok", "admin_query"),
        ("berapa total pemasukan bulan ini", "admin_query"),
        ("ada berapa komplain hari ini", "admin_query"),
        ("cek omzet minggu ini", "admin_query"),
        ("lihat daftar order pending", "admin_query"),
        ("tampilkan jumlah pelanggan baru", "admin_query"),
        ("cek rating teknisi andi", "admin_query"),

        # tech_query - Pertanyaan teknis (untuk teknisi)
        ("bagaimana cara isi freon", "tech_query"),
        ("apa sop cuci ac", "tech_query"),
        ("bagaimana memperbaiki ac bocor", "tech_query"),
        ("standar tekanan freon r32", "tech_query"),
        ("cara reset remot ac daikin", "tech_query"),
        ("kode error E4 ac sharp artinya apa?", "tech_query"),
        ("kapasitor ukuran berapa untuk ac 1 pk?", "tech_query"),
        ("cara cek amper kompresor", "tech_query"),
        ("langkah-langkah vacuum ac", "tech_query"),

        # lainnya - Intent yang belum teridentifikasi
        ("ya ampun", "lainnya"),
        ("wow", "lainnya"),
        ("hehe", "lainnya"),
        ("haha", "lainnya"),
    ]

    df = pd.DataFrame(data, columns=["text", "intent"])

    # Encode labels
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(df["intent"])
    class_names = label_encoder.classes_

    print(f"\nTotal samples: {len(df)}")
    print(f"Number of intents: {len(class_names)}")
    print(f"Intent classes: {list(class_names)}")

    # Check class distribution
    print("\nClass distribution:")
    intent_counts = df['intent'].value_counts()
    for intent, count in intent_counts.items():
        print(f"  {intent:20s}: {count:3d} samples")

    # Train/test split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(
        df["text"], y, test_size=0.2, random_state=42, stratify=y
    )

    # Vectorize with n-grams for better context understanding
    vectorizer = TfidfVectorizer(
        lowercase=True,
        ngram_range=(1, 2),
        max_features=10000,
        sublinear_tf=True
    )
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    # Try multiple models and select the best one
    models = {
        'MultinomialNB': MultinomialNB(alpha=0.1),
        'LogisticRegression': LogisticRegression(max_iter=1000, C=1.0, solver='lbfgs'),
        'LinearSVC': LinearSVC(C=0.1, max_iter=10000),
    }

    best_model = None
    best_f1 = 0
    best_name = ''

    print("\n" + "=" * 80)
    print("Training and evaluating models...")
    print("=" * 80)

    for name, model in models.items():
        print(f"\nTraining {name}...")
        model.fit(X_train_vec, y_train)

        # Evaluate on training set
        y_train_pred = model.predict(X_train_vec)
        train_f1 = f1_score(y_train, y_train_pred, average='weighted')

        # Evaluate on test set
        y_test_pred = model.predict(X_test_vec)
        test_f1 = f1_score(y_test, y_test_pred, average='weighted')
        test_precision = precision_score(y_test, y_test_pred, average='weighted')
        test_recall = recall_score(y_test, y_test_pred, average='weighted')

        print(f"  Train F1: {train_f1:.4f}")
        print(f"  Test F1: {test_f1:.4f}")
        print(f"  Test Precision: {test_precision:.4f}")
        print(f"  Test Recall: {test_recall:.4f}")

        if test_f1 > best_f1:
            best_f1 = test_f1
            best_model = model
            best_name = name

    print(f"\n{'=' * 80}")
    print(f"Selected model: {best_name} with Test F1: {best_f1:.4f}")
    print(f"{'=' * 80}")

    # Final evaluation with best model
    y_train_pred = best_model.predict(X_train_vec)
    y_test_pred = best_model.predict(X_test_vec)

    print("\n" + "=" * 80)
    print("FINAL EVALUATION")
    print("=" * 80)

    print("\n=== Training Set Metrics ===")
    print(classification_report(y_train, y_train_pred, target_names=class_names))
    train_precision = precision_score(y_train, y_train_pred, average='weighted')
    train_recall = recall_score(y_train, y_train_pred, average='weighted')
    train_f1 = f1_score(y_train, y_train_pred, average='weighted')
    print(f"Weighted Precision: {train_precision:.4f}")
    print(f"Weighted Recall: {train_recall:.4f}")
    print(f"Weighted F1: {train_f1:.4f}")

    print("\n=== Test Set Metrics ===")
    print(classification_report(y_test, y_test_pred, target_names=class_names))
    test_precision = precision_score(y_test, y_test_pred, average='weighted')
    test_recall = recall_score(y_test, y_test_pred, average='weighted')
    test_f1 = f1_score(y_test, y_test_pred, average='weighted')
    print(f"Weighted Precision: {test_precision:.4f}")
    print(f"Weighted Recall: {test_recall:.4f}")
    print(f"Weighted F1: {test_f1:.4f}")

    # Confusion matrix for detailed analysis
    print("\n=== Confusion Matrix ===")
    cm = confusion_matrix(y_test, y_test_pred)
    print("Intents:", list(class_names))
    print("Matrix:")
    print(cm)

    # Save model, vectorizer, and label encoder
    joblib.dump(best_model, "intent_model.pkl")
    joblib.dump(vectorizer, "vectorizer.pkl")
    joblib.dump(label_encoder, "label_encoder.pkl")

    # Also save the model type for reference
    with open("model_type.txt", "w") as f:
        f.write(f"model_type={best_name}\n")
        f.write(f"train_f1={train_f1:.4f}\n")
        f.write(f"test_f1={test_f1:.4f}\n")
        f.write(f"test_precision={test_precision:.4f}\n")
        f.write(f"test_recall={test_recall:.4f}\n")
        f.write(f"num_classes={len(class_names)}\n")
        f.write(f"classes={' '.join(class_names)}\n")

    print("\n" + "=" * 80)
    print("Model trained and saved successfully.")
    print(f"Model type: {best_name}")
    print(f"Test F1 Score: {test_f1:.4f}")
    print("Files saved: intent_model.pkl, vectorizer.pkl, label_encoder.pkl, model_type.txt")
    print("Intent classes:", list(class_names))
    print("=" * 80)


if __name__ == "__main__":
    train_model()
