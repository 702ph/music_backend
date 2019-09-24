MAX_CONTENT_LENGTH = 16 * 1024 * 1024 # max file size = 16MB
UPLOAD_FOLDER = "static/uploads"
DB_PATH = "db/music.db"
DB_PATH_ALCHEMY = "sqlite:///db/music.db"
JSON_SORT_KEYS = False
SECRET_KEY = "develop"
JWT_AUTH_URL_RULE = "/auth"  # it doesn't accept any except /auth... ?
ALLOWED_EXTENSIONS = set(["mp3"])