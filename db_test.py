import sqlite3


def post_song():
    my_db = sqlite3.connect("db/music.db")
    cursor = my_db.cursor()

    cursor.execute(
    """
    insert into
    song(title, album, year, genre, data, created_at, path)
    values("title", "album", "year", "genre", "data", "created_at", "path");
    """)

    cursor.execute("""select * from song where id = (select max(id) from song);""")

    fetch_all = cursor.fetchall()
    cursor.close()
    return fetch_all