import sqlite3


def post_song():
    my_db = sqlite3.connect("db/music.db")
    cursor = my_db.cursor()

    cursor.execute(
    """
    insert into
    s(title, album, year, genre, data, created_at, path)
    values("title", "album", "year", "genre", "data", "created_at", "path");
    """)

    cursor.execute("""select * from s where id = (select max(id) from s);""")

    fetch_all = cursor.fetchall()
    cursor.close()
    return fetch_all