import wikipediaapi
import sys
import json

def fetch_wikipedia_data(query, lang='id'):
    # Inisialisasi Wikipedia API dengan user agent (wajib menurut kebijakan Wikipedia)
    wiki = wikipediaapi.Wikipedia(
        user_agent='MyDiscordBot/1.0 (https://github.com/razaeldotexe/open-0)',
        language=lang,
        extract_format=wikipediaapi.ExtractFormat.WIKI
    )

    page = wiki.page(query)

    if not page.exists():
        return {"error": "Halaman tidak ditemukan."}

    # Mengambil data dasar
    data = {
        "title": page.title,
        "summary": page.summary, # Ambil ringkasan penuh
        "fullurl": page.fullurl,
        "image": None
    }

    # Mengambil gambar utama jika ada
    # Library wikipediaapi tidak mendukung pengambilan gambar secara langsung dengan mudah,
    # Namun kita bisa mengambilnya jika tersedia di data page.
    # Sebagai alternatif yang lebih handal, kita bisa menggunakan thumbnail jika tersedia.
    if page.sections:
        # Mencoba mengambil URL gambar dari properti internal jika memungkinkan
        # atau kita biarkan kosong jika tidak ada yang mudah diakses.
        pass
    
    return data
    
    return data

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Mohon berikan query pencarian."}))
        sys.exit(1)

    search_query = " ".join(sys.argv[1:])
    result = fetch_wikipedia_data(search_query)
    
    # Cetak hasil dalam format JSON agar mudah dibaca oleh Node.js atau sistem lain
    print(json.dumps(result, indent=4, ensure_ascii=False))
