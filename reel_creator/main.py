
import tkinter as tk
from tkinter import ttk

def main():
    root = tk.Tk()
    root.title("Reel Creator")
    root.geometry("800x600")

    notebook = ttk.Notebook(root)
    notebook.pack(pady=10, expand=True)

    # Create a frame for the AI Product Reel tab
    ai_product_reel_frame = ttk.Frame(notebook, width=800, height=580)
    ai_product_reel_frame.pack(fill='both', expand=True)
    notebook.add(ai_product_reel_frame, text='AI Product Reel')

    # Add content to the AI Product Reel tab
    ai_product_reel_label = ttk.Label(ai_product_reel_frame, text="Upload your product images and simple clips to get started.")
    ai_product_reel_label.pack(pady=20)

    # Add a button to upload files
    upload_button = ttk.Button(ai_product_reel_frame, text="Upload Files")
    upload_button.pack(pady=10)

    # Add a button to generate the reel
    generate_button = ttk.Button(ai_product_reel_frame, text="Generate Reel")
    generate_button.pack(pady=10)

    root.mainloop()

if __name__ == "__main__":
    main()
