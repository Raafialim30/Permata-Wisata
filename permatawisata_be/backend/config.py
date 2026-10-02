import os


class Config:
    """
    Konfigurasi utama aplikasi Permata Wisata.
    """

    # =========================================================
    # DATABASE
    # =========================================================
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://root:@localhost/permata_wisata"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False


# =============================================================
# KONFIGURASI UNTUK DEVELOPMENT
# =============================================================

class DevelopmentConfig(Config):
    """
    Konfigurasi saat aplikasi dijalankan di komputer lokal.
    """
    DEBUG = True


# =============================================================
# KONFIGURASI UNTUK PRODUCTION
# =============================================================

class ProductionConfig(Config):
    """
    Konfigurasi saat aplikasi dijalankan di server/hosting.
    """
    DEBUG = False


# =============================================================
# DEFAULT CONFIGURATION
# =============================================================

class DefaultConfig(Config):
    """
    Konfigurasi default aplikasi.
    """
    DEBUG = True