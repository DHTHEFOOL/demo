import os
import glob
import csv
import numpy as np
import matplotlib.pyplot as plt
from scipy.io import wavfile

# --- CẤU HÌNH THAM SỐ ---
AUDIO_DIR = "./audio_files"        # Thư mục chứa các file .wav
OUTPUT_CSV = "ground_truth.csv"    # File CSV xuất kết quả
MAX_FILES = 10                     # Số lượng file cần gán nhãn thủ công
FRAME_LEN_SEC = 0.1                # Frame ngầm định 100 ms
FRAME_SHIFT_SEC = 0.01             # Độ dịch frame 10 ms

def compute_ste(signal, fs, frame_len_sec=0.1, frame_shift_sec=0.01):
    """Tính Short-Time Energy (STE) theo frame 100ms và dịch 10ms"""
    frame_len = int(fs * frame_len_sec)
    frame_shift = int(fs * frame_shift_sec)
    num_samples = len(signal)
    
    # Chuẩn hóa biên độ tín hiệu về [-1, 1] nếu là số nguyên
    if signal.dtype != np.float32 and signal.dtype != np.float64:
        signal = signal.astype(np.float32) / np.max(np.abs(signal))
        
    num_frames = 1 + int(np.floor((num_samples - frame_len) / frame_shift))
    ste = np.zeros(num_frames)
    time_ste = np.zeros(num_frames)
    
    for i in range(num_frames):
        start = i * frame_shift
        end = start + frame_len
        frame = signal[start:end]
        ste[i] = np.sum(frame ** 2)  # Tổng bình phương năng lượng
        time_ste[i] = (start + frame_len / 2) / fs  # Mốc thời gian giữa frame
        
    return ste, time_ste, frame_shift

def manual_annotate():
    # Lấy danh sách file .wav
    wav_files = sorted(glob.glob(os.path.join(AUDIO_DIR, "*.wav")))[:MAX_FILES]
    if not wav_files:
        print(f"Không tìm thấy file .wav nào trong thư mục '{AUDIO_DIR}'!")
        return

    # Chuẩn bị file CSV ghi kết quả
    with open(OUTPUT_CSV, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["file_name", "theta", "N1_sec", "N2_sec", "N1_frame", "N2_frame"])

        print("=== BẮT ĐẦU GÁN NHÃN THỦ CÔNG ===")
        print("Với mỗi file:")
        print("  - Click 1: Chọn N1 (Bắt đầu tiếng nói) trên đồ thị Waveform/STE.")
        print("  - Click 2: Chọn N2 (Kết thúc tiếng nói) trên đồ thị Waveform/STE.")
        print("  - Click 3: Chọn ngưỡng năng lượng Theta trên đồ thị STE (trục Y).")
        print("-----------------------------------------------------------------")

        for idx, file_path in enumerate(wav_files):
            file_name = os.path.basename(file_path)
            fs, audio = wavfile.read(file_path)
            
            # Xử lý audio nếu là Stereo -> chuyển sang Mono
            if len(audio.shape) > 1:
                audio = audio[:, 0]
                
            time_wave = np.arange(len(audio)) / fs
            ste, time_ste, frame_shift = compute_ste(audio, fs, FRAME_LEN_SEC, FRAME_SHIFT_SEC)

            # Vẽ đồ thị
            fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 6), sharex=True)
            fig.canvas.manager.set_window_title(f"[{idx + 1}/{len(wav_files)}] - {file_name}")

            # Đồ thị Waveform
            ax1.plot(time_wave, audio, color="tab:blue", lw=0.7)
            ax1.set_title(f"File: {file_name} - Dạng sóng (Waveform)")
            ax1.set_ylabel("Biên độ")
            ax1.grid(True, linestyle="--", alpha=0.5)

            # Đồ thị Short-Time Energy
            ax2.plot(time_ste, ste, color="tab:red", lw=1.2)
            ax2.set_title("Short-Time Energy (Frame 100ms, Shift 10ms)")
            ax2.set_xlabel("Thời gian (giây)")
            ax2.set_ylabel("STE")
            ax2.grid(True, linestyle="--", alpha=0.5)

            plt.tight_layout()
            plt.draw()

            # Nhận 3 lần click chuột từ người dùng
            # Click 1: N1 (trục X), Click 2: N2 (trục X), Click 3: Theta (trục Y của đồ thị STE)
            points = plt.ginput(3, timeout=-1)
            plt.close(fig)

            # Trích xuất giá trị từ các điểm click
            t_clicks = sorted([points[0][0], points[1][0]])  # Sắp xếp thời gian N1 < N2
            n1_sec, n2_sec = t_clicks[0], t_clicks[1]
            theta = points[2][1]  # Lấy giá trị tung độ (trục Y của click thứ 3)

            # Quy đổi từ giây sang chỉ số frame (Frame Index)
            n1_frame = int(np.round(n1_sec / FRAME_SHIFT_SEC))
            n2_frame = int(np.round(n2_sec / FRAME_SHIFT_SEC))

            # Ghi vào CSV
            writer.writerow([file_name, f"{theta:.6f}", f"{n1_sec:.4f}", f"{n2_sec:.4f}", n1_frame, n2_frame])
            print(f"[{idx+1}/{len(wav_files)}] Đã lưu: {file_name} -> N1={n1_sec:.3f}s (Frame {n1_frame}), N2={n2_sec:.3f}s (Frame {n2_frame}), Theta={theta:.6f}")

    print(f"\nHoàn thành 10 file! Dữ liệu ground-truth đã được lưu tại: '{OUTPUT_CSV}'.")

if __name__ == "__main__":
    manual_annotate()
:wq

