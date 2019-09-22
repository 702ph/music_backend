import os
import sqlite3
import io
import datetime
import timestring
import hashlib

from flask import Flask, json, jsonify, request, make_response, render_template, url_for  # なぜかrequestsでは動かない。
from flask_cors import CORS
from flask_restful import Api, http_status_message
from werkzeug.utils import secure_filename, redirect
from werkzeug.security import safe_str_cmp
from mutagen.easyid3 import EasyID3
from mutagen.mp3 import EasyMP3
from flask_jwt import JWT, jwt_required, current_identity

from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

#todo: refactor
from sqlalchemy import Integer, Column, String
from sqlalchemy import create_engine, LargeBinary

#from sqlalchemy.ext.serializer import loads, dumps
# from flask_sqlalchemy import SQLAlchemy

from flask_marshmallow import Marshmallow

## problem installing modules. have to type ./env/bin/pip

ALLOWED_EXTENSIONS = set(["mp3"])
app = Flask(__name__)
app.config.from_pyfile("config.py")
api = Api(app)
CORS(app)
# db = SQLAlchemy(app)
# ma = Marshmallow(app)

engine = create_engine("sqlite:///db/music.db")
Session = sessionmaker(bind=engine)
session = Session()
Base = declarative_base()


class Song(Base):
    __tablename__ = "song"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key= True)
    title = Column(String)
    album = Column(String)
    year = Column(String)  # TODO: redactor with some date type? -> ie. date
    genre = Column(String)
    created_at = Column(String)  # TODO: redactor some date type? ->ie. date
    artist = Column(String)
    user_id = Column(Integer)
    data = Column(LargeBinary)

    # return dictionary without user_id
    def to_dict(self):
        entry = {}
        for column in self.__table__.columns:
            if not column.name == "user_id":
                entry[column.name] = str(getattr(self, column.name))
        return entry


class UserSQL(Base):
    __tablename__ = "user"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True)
    name = Column(String)
    password = Column(String)


# ================= for SQLAlchemy implementation Restful ===============

# we don't need user list
@app.route("/sql_users")
def show_users():
    users = session.query(UserSQL).all()
    # print("users: ", users)
    for user in users:
        print(user)

        # for value in user: ##TODO: user(UserSQL) is not iterable.
        #    print(value)

    #return jsonify(users)
    return users.json


@app.route("/sql_songs/", methods=['GET'])
@app.route("/sql_songs", methods=['GET'])
#@jwt_required()
def show_songs():
    # songs = session.query(Song).all()
    # songs = session.query(Song.id, Song.title, Song.artist, Song.album, Song.genre, Song.created_at).filter(Song.user_id == current_identity.id)
    # songs = session.query(Song.id, Song.title, Song.artist, Song.album, Song.genre, Song.created_at).filter(Song.user_id == 2).all()
    songs = session.query(Song).filter(Song.user_id == 2).all()

    entries = []  # array for all dictionaries(all songs)
    for song in songs:
        entries.append(song.to_dict())

    result = jsonify(entries)
    return result


# ================= for SQLAlchemy implementation ===============


# return list of all column for song in json
@app.route("/songs/", methods=['GET'])
@app.route("/songs", methods=['GET'])
@jwt_required()
def get_song_list():
    print("/songs: current_identity: ", current_identity)

    db_connection = sqlite3.connect(app.config["DB_PATH"])
    db_cursor = db_connection.cursor()

    db_cursor.execute("select id, title, artist, album, year, genre, created_at from song where user_id=?", (current_identity.id,))

    fetch_all = db_cursor.fetchall()
    description = db_cursor.description  # has to be placed after SQL Query

    # 1. variation
    """
    entries = []
    for row in fetch_all:
        entries.append({
            "id": row[0],
            "title": row[1],
            "album": row[2],
            "year": row[3],
            "genre": row[4],
            "created_at": row[5]
        })
    """

    # 2. variation as in slide from prof.
    """
    entries = [{
        "id": row[0],
        "title": row[1],
        "album": row[2],
        "year": row[3],
        "genre": row[4],
        "created_at": row[5]
    }for row in fetch_all]
    """

    # 3. variation (automatic key generation)
    entries = []  # array for all dictionaries
    for row in fetch_all:

        # dictionary for each row
        entry = {}
        for i_desc, val_desc in enumerate(description):
            entry.update({val_desc[0]: row[i_desc]})
        entries.append(entry)

    db_cursor.close()
    db_connection.close()

    result = jsonify(entries)
    return result


def allowed_file(filename):
    return "." in filename and \
           filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def save_to_local_filesysytem(file):
    filename = secure_filename(file.filename)

    # 1. variation
    # filepath = os.path.dirname(os.path.abspath(__file__)) + app.config["UPLOAD_FOLDER"]
    # absolute_filepath_name = filepath + "/" + filename

    # 2. variation
    os.getcwd()
    absolute_filepath_name = os.path.abspath(app.config["UPLOAD_FOLDER"]) + "/" + filename

    print(absolute_filepath_name)
    file.save(absolute_filepath_name)


def save_to_db(file, file_name):
    db_connection = sqlite3.connect(app.config["DB_PATH"])
    db_cursor = db_connection.cursor()

    # https://codeday.me/jp/qa/20190110/126212.html
    # binary = sqlite3.Binary(file.stream.read()) # works!
    binary = sqlite3.Binary(file.read())  # works! same!

    # get mp3 tags
    mp3_infos = get_mp3_infos(binary)

    print("save_to_db():")
    print(mp3_infos)

    # get current date time
    date_now = datetime.datetime.now()

    # get date from mp
    year_mp3 = timestring.Date(mp3_infos["date"]).year

    #
    print("current_identity")
    print(current_identity)

    # insert to db
    # at least one column should have value. if there are no tags in mp3, take file name for the title.
    if mp3_infos.get("title") is None:
        # param = (file_name, mp3_infos["artist"], mp3_infos["album"], year_mp3, mp3_infos["genre"], binary, date_now,)
        param = (file_name, mp3_infos["artist"], mp3_infos["album"], year_mp3, mp3_infos["genre"], binary, date_now, current_identity.id,)

    else:
        param = (
        mp3_infos["title"], mp3_infos["artist"], mp3_infos["album"], year_mp3, mp3_infos["genre"], binary, date_now, current_identity.id,)
    # db_cursor.execute("insert into song(title, artist, album, year, genre, data, created_at) values(?, ?, ?, ?, ?, ?, ?);", param)
    db_cursor.execute(
        "insert into song(title, artist, album, year, genre, data, created_at, user_id) values(?, ?, ?, ?, ?, ?, ?, ?);", param)

    db_cursor.close()
    db_connection.commit()
    db_connection.close()
    return True


def get_mp3_infos(file):
    # initiate EasyMP3 class
    mp3 = EasyMP3(io.BytesIO(file))

    # initialize
    id3_tags = dict()
    result = dict()

    # get length
    length = mp3.info.length
    result.update({"length": length})

    # get tags #this way isn't suitable. only the tags are iterated which the file has.
    """
    for key in mp3.tags:  # mp3.tags return key of dictionary. here ie.: title, artist, genre, date.
        # artist name is at 0. position in array in a dictionary(or tuple?). ie: {"artist":["artist name]}.
        # we have to get it by giving index 0.
        value = mp3.tags.get(key)[0]
        result.update({key: value})
    """

    # get tags. this one works.
    for key in mp3.ID3.valid_keys.keys():  # iterate through mp3 keys which in ID3 designated
        value = mp3.tags.get(key)[0] if mp3.tags.get(
            key) is not None else None  # keys in 0. position in array. sometimes key doesn't has value so None have to be returned
        id3_tags.update({key: value})
    return id3_tags


def save_songs():
    # http://flask.pocoo.org/docs/1.0/patterns/fileuploads/
    # check if the post request has the file part
    if not ("inputFile" in request.files or "input_file" in request.files):
        return jsonify({"error": "no file part"})

    file = None
    if "inputFile" in request.files:  # for HTML form
        file = request.files["inputFile"]
        # file2 = request.files.get("inputFile") #this also works? have't tried yet

    if "input_file" in request.files:  # for formData()
        file = request.files["input_file"]
        # file2 = request.files.get("input_file") ##this also works? have't tried yet

    # even so if user does not select file, browser also submit an empty part without filename
    if file.filename == "":
        return jsonify({"error": "has no filename"})

    if file and allowed_file(file.filename):
        # save_file_to_local(file)
        result = save_to_db(file, file.filename)

        # return redirect(url_for("uploaded_file", filename=filename))
        return jsonify(result)


def update_db():
    print("update_db")

    # get json
    song_list = request.json

    # prepare db
    db_connection = sqlite3.connect(app.config["DB_PATH"])
    db_cursor = db_connection.cursor()

    # update db
    for song in song_list:
        # print(song)
        param = (song["title"], song["artist"], song["album"], song["year"], song["genre"], song["id"], current_identity.id,)
        db_cursor.execute("UPDATE song SET title=?, artist=?, album=?, year=?, genre=? WHERE (id=? and user_id=?);", param)

    # close db
    db_cursor.close()
    db_connection.commit()
    db_connection.close()

    status = True
    return jsonify({"update": status})


@app.route("/songs", methods=["POST"])
@jwt_required()
def songs_post():
    if request.is_json:
        return update_db()
    else:
        return save_songs()


# create response from local filesystem
def read_from_local_filesystem():
    filename = "Lied.mp3"
    os.getcwd()  # get current path where this project exists
    absolute_filepath_name = os.path.abspath(app.config["UPLOAD_FOLDER"]) + "/" + filename
    # https://docs.python.org/ja/3/library/functions.html#open
    # r:read, b:binary for second parameter
    file = open(absolute_filepath_name, "rb").read()
    return file


@app.route("/songs/<song_id>", methods=["GET"])
@jwt_required()
def read_song(song_id):
    filename = "song.mp3"  # have to be implemented
    # file = read_from_db(song_id)
    file = read_from_db_alchemy(song_id)

    # create response
    response = make_response()
    response.data = file
    response.headers["Content-Disposition"] = "attachment; filename=" + filename
    response.mimetype = "audio/mpeg"

    print(response.mimetype)

    # https://qiita.com/kekeho/items/58b24c2400ead44f3561
    return response


# create response from db
def read_from_db(song_id):
    db_connection = sqlite3.connect(app.config["DB_PATH"])
    db_cursor = db_connection.cursor()

    # execute SQL Query
    db_cursor.execute("select data from song where (id=? and user_id=?)", (song_id, current_identity.id))
    row = db_cursor.fetchone()
    file = row[0]  # get 1. row

    ## close db
    db_cursor.close()
    db_connection.commit()
    db_connection.close()
    return file


# create response from db
def read_from_db_alchemy(song_id):
    # db_connection = sqlite3.connect(app.config["DB_PATH"])
    # db_cursor = db_connection.cursor()
    #
    # # execute SQL Query
    # db_cursor.execute("select data from song where (id=? and user_id=?)", (song_id, current_identity.id))
    # row = db_cursor.fetchone()
    # file = row[0]  # get 1. row

    song = session.query(Song).filter(Song.id == song_id, Song.user_id == current_identity.id).all()
    file = song.data

    # close db
    # db_cursor.close()
    # db_connection.commit()
    # db_connection.close()
    return file


@app.route("/songs/<song_id>", methods=["DELETE"])
@jwt_required()
def delete_song(song_id):
    db_connection = sqlite3.connect("db/music.db")
    db_cursor = db_connection.cursor()
    param = (song_id, current_identity.id)

    fetch_all = None
    try:
        # delete
        db_cursor.execute("delete from song where (id=? and user_id=?)", param)

        # after delete
        db_cursor.execute("select id,title,album,year,genre,created_at from s where user_id=?", (current_identity.id,))
        fetch_all = db_cursor.fetchall()
    except sqlite3.Error as e:
        print("sqlite3.Error: ", e.args[0])

    db_cursor.close()
    db_connection.commit()  # changes will not be saved without commit
    db_connection.close()
    return jsonify(fetch_all)


@app.errorhandler(400)
@app.errorhandler(404)
@app.errorhandler(500)
def error_handler(error):
    response = jsonify({
        "error": {
            "type": error.name,
            "message": error.description
        }
    })
    return response, error.code


@app.route('/')
def web_app_main_page():
    return render_template("player.html")


"""""""""""""""""""""""""""""""JWT"""""""""""""""""""""""""""


class User(object):
    def __init__(self, id, username, password):  # constructor
        self.id = id
        self.username = username
        self.password = password

    def __str__(self):  # toString
        return "User(id='%s')" % self.id


def get_user_info_by_username_from_db(username):
    db_connection = sqlite3.connect(app.config["DB_PATH"])
    db_cursor = db_connection.cursor()

    result = None
    try:
        db_cursor.execute("select * from user where name=?", (username,))
        fetch_one = db_cursor.fetchone()

        if fetch_one:
            result = User(fetch_one[0], fetch_one[1], fetch_one[2])
        else:
            result = None

    except sqlite3.Error as e:
        print("sqlite3.Error: ", e.args[0])

    db_cursor.close()
    db_connection.close()
    return result


def get_user_info_by_id_from_db(id):
    db_connection = sqlite3.connect(app.config["DB_PATH"])
    db_cursor = db_connection.cursor()

    result = None
    try:
        db_cursor.execute("select * from user where id=?", (id,))
        fetch_one = db_cursor.fetchone()

        if fetch_one:
            result = User(fetch_one[0], fetch_one[1], fetch_one[2])
        else:
            result = None

    except sqlite3.Error as e:
        print("sqlite3.Error: ", e.args[0])

    db_cursor.close()
    db_connection.close()
    return result


# this is called when /auth is accessed.
def authenticate(username, password):
    # get user info from db
    user_info = get_user_info_by_username_from_db(username)

    # user info from db
    password_from_db = user_info.password.encode('utf-8')

    # user info from browser. make hash.
    password_from_request = hashlib.sha256(password.encode('utf-8')).hexdigest()

    # None and True results in None. it's the same as false and followed statement will not be executed.
    if user_info and safe_str_cmp(password_from_db, password_from_request):
        return user_info


# this is called when def with @jwt_required() is accessed.
def identity(payload):
    user_id = payload['identity']  # get value for key "identity" in payload
    result = get_user_info_by_id_from_db(user_id)
    return result


@app.route('/who')
@jwt_required()
def who_am_i():
    request
    return jsonify({"username": current_identity.username})


# for debug
@app.route('/protected')
@jwt_required()
def protected():
    return '%s' % current_identity


jwt = JWT(app, authenticate, identity)

# ========================================
# this should be after @app.route


if __name__ == '__main__':
    # jwt = JWT(app, authenticate, identity)
    app.debug = True
    app.run()
