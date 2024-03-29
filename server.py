import io
import datetime
import timestring
import hashlib

from flask import Flask, jsonify, request, make_response, render_template
from flask_cors import CORS
from flask_restful import Api
from werkzeug.security import safe_str_cmp
from mutagen.mp3 import EasyMP3
from flask_jwt import JWT, jwt_required, current_identity
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Integer, Column, String, create_engine, LargeBinary

## to install modules. have to type ./env/bin/pip

app = Flask(__name__)
app.config.from_pyfile("config.py")
api = Api(app)
CORS(app)

engine = create_engine(app.config["DB_PATH_ALCHEMY"])
Session = sessionmaker(bind=engine)
session = Session()
Base = declarative_base()


class Song(Base):
    __tablename__ = "song"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key= True)
    title = Column(String)
    album = Column(String)
    year = Column(String)
    genre = Column(String)
    created_at = Column(String)
    artist = Column(String)
    user_id = Column(Integer)
    data = Column(LargeBinary)

    # return dictionary without user_id & data
    def to_dict(self):
        entry = {}
        for column in self.__table__.columns:
            if not (column.name == "user_id" or column.name == "data"):
                entry[column.name] = str(getattr(self, column.name))
        return entry


class UserSQL(Base):
    __tablename__ = "user"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True)
    name = Column(String)
    password = Column(String)


@app.route("/songs/", methods=['GET'])
@app.route("/songs", methods=['GET'])
@jwt_required()
def show_songs():
    songs = session.query(Song).filter(Song.user_id == current_identity.id).all()
    session.close()

    entries = []  # array for all dictionaries(all songs)
    for song in songs:
        entries.append(song.to_dict())

    result = jsonify(entries)
    return result


def allowed_file(filename):
    return "." in filename and \
           filename.rsplit(".", 1)[1].lower() in app.config["ALLOWED_EXTENSIONS"]


def save_to_db(file, file_name):
    # get data
    binary = file.read()

    # get mp3 tags
    mp3_infos = get_mp3_infos(binary)

    print("save_to_db():")
    print(mp3_infos)

    # get current date time
    date_now = datetime.datetime.now()

    # get date from mp
    year_mp3 = timestring.Date(mp3_infos["date"]).year

    # initialize model
    song = Song()

    # add value to model
    # at least one column should have value. if there are no tags in mp3, take file name for the title.
    if mp3_infos.get("title") is None:
        song.title = file_name
    else:
        song.title = mp3_infos["title"]

    # add the rest values to model
    song.artist = mp3_infos["artist"]
    song.album = mp3_infos["album"]
    song.year = year_mp3
    song.genre = mp3_infos["genre"]
    song.data = binary
    song.created_at = date_now
    song.user_id = current_identity.id

    try:
        session.add(song)
        session.commit()
    except Exception as e:
        print("Exception args: ", e.args)
        return False

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


# update database (except binary data) or save new song data
@app.route("/songs", methods=["POST"])
@jwt_required()
def songs_post():
    if request.is_json:
        return update_db()
    else:
        return save_songs()


# update database (except binary data)
def update_db():

    # get json
    song_list = request.json

    try:
    # update db
        for song in song_list:
            # query
            song_in_db = session.query(Song).filter(Song.id == song["id"], Song.user_id == current_identity.id).first()

            # update
            song_in_db.title = song["title"]
            song_in_db.artist = song["artist"]
            song_in_db.album = song["album"]
            song_in_db.year = song["year"]
            session.commit()

        session.close()
    except Exception as e:
        print("Exception args: ", e.args)

    status = True
    return jsonify({"update": status})


# create response
@app.route("/songs/<song_id>", methods=["GET"])
@jwt_required()
def read_song(song_id):
    filename = "song.mp3"  # needed for browser
    file = read_from_db(song_id)

    # create response
    response = make_response()
    response.data = file
    response.headers["Content-Disposition"] = "attachment; filename=" + filename
    response.mimetype = "audio/mpeg"

    print(response.mimetype)

    # https://qiita.com/kekeho/items/58b24c2400ead44f3561
    return response


# read data from db
def read_from_db(song_id):
    try:
        # query
        song = session.query(Song).filter(Song.id == song_id, Song.user_id == current_identity.id).all()

        # extract binary data
        file = song[0].data

        # close session
        session.close()
    except Exception as e:
        print("Exception args: ", e.args)

    return file


@app.route("/songs/<song_id>", methods=["DELETE"])
@jwt_required()
def delete_song(song_id):
    return delete_song_from_db(song_id)


def delete_song_from_db(song_id):
    entries = []  # array for all dictionaries(all songs)
    try:
        # delete song specified
        session.query(Song).filter(Song.id == song_id).delete()

        # after delete
        songs = session.query(Song).filter(Song.user_id == current_identity.id).all()

        for song in songs:
            entries.append(song.to_dict())

        session.commit()
        session.close()

    except Exception as e:
        print("Exception args: ", e.args)

    return jsonify(entries)


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
    result = None
    try:
        # query
        user = session.query(UserSQL).filter(UserSQL.name == username).first()

        # get user infos
        result = User(user.id, user.name, user.password)

        session.close()

    except Exception as e:
        print("get_user_info_by_username_from_db(): Exception args: ", e.args)

    return result


def get_user_info_by_id_from_db(user_id):

    result = None
    try:
        # query
        user = session.query(UserSQL).filter(UserSQL.id == user_id).first()

        # get user infos
        result = User(user.id, user.name, user.password)

        session.close()

    except Exception as e:
        print("get_user_info_by_id_from_db(): Exception args: ", e.args)

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
