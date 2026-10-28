import os
import sys
import tempfile
import unittest
import jwt
from unittest.mock import Mock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app import app
from security import JWT_ALGORITHM, JWT_SECRET


class AddVillaTestCase(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.admin_connection = Mock()
        self.admin_cursor = Mock()
        self.admin_cursor.fetchone.return_value = {"id": 1, "role": "admin"}
        self.admin_connection.cursor.return_value = self.admin_cursor
        self.db_patcher = patch(
            "db.get_db_connection",
            return_value=self.admin_connection,
        )
        self.db_patcher.start()
        self.addCleanup(self.db_patcher.stop)
        token = jwt.encode(
            {"user_id": 1, "role": "admin"},
            JWT_SECRET,
            algorithm=JWT_ALGORITHM,
        )
        self.admin_headers = {"Authorization": f"Bearer {token}"}

    @patch("routes.manage_villas.get_villas_img_dir")
    def test_public_media_route_serves_uploaded_villa_images(self, get_villas_img_dir):
        with tempfile.TemporaryDirectory() as image_root:
            villa_folder = os.path.join(image_root, "villa_70")
            os.makedirs(villa_folder)
            image_path = os.path.join(villa_folder, "download.jpg")
            with open(image_path, "wb") as image_file:
                image_file.write(b"test-image-bytes")
            get_villas_img_dir.return_value = image_root

            with self.client.get(
                "/media/villas/villa_70/download.jpg"
            ) as response:
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data, b"test-image-bytes")
                self.assertIn("no-cache", response.headers["Cache-Control"])

    @patch("routes.manage_villas._owner_exists", return_value=(True, {"id": 2, "role": "owner"}))
    @patch("routes.manage_villas.get_db_connection")
    def test_new_villa_uses_database_id_instead_of_browser_preview_id(
        self,
        get_db_connection,
        _owner_exists,
    ):
        cursor = Mock()
        cursor.lastrowid = 321
        connection = Mock()
        connection.cursor.return_value = cursor
        get_db_connection.return_value = connection

        response = self.client.post(
            "/api/admin/villas",
            json={
                "id": 9876,
                "name": "Villa Test",
                "location": "Yogyakarta",
                "owner_user_id": 2,
            },
            headers=self.admin_headers,
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["villa_id"], 321)
        connection.commit.assert_called_once()
        sql, params = cursor.execute.call_args.args
        self.assertNotIn("\n                    id,", sql)
        self.assertNotIn(9876, params)
        self.assertEqual(sql.count("%s"), len(params))

    @patch("routes.manage_villas._owner_exists", return_value=(False, None))
    @patch("routes.manage_villas.get_db_connection")
    def test_new_villa_rejects_invalid_owner_without_insert(
        self,
        get_db_connection,
        _owner_exists,
    ):
        cursor = Mock()
        connection = Mock()
        connection.cursor.return_value = cursor
        get_db_connection.return_value = connection

        response = self.client.post(
            "/api/admin/villas",
            json={
                "name": "Villa Test",
                "location": "Yogyakarta",
                "owner_user_id": 9999,
            },
            headers=self.admin_headers,
        )

        self.assertEqual(response.status_code, 400)
        cursor.execute.assert_not_called()
        connection.commit.assert_not_called()

    @patch("routes.manage_villas.get_db_connection")
    def test_new_villa_remains_unassigned_until_owner_registration_is_approved(
        self,
        get_db_connection,
    ):
        cursor = Mock()
        cursor.lastrowid = 322
        connection = Mock()
        connection.cursor.return_value = cursor
        get_db_connection.return_value = connection

        response = self.client.post(
            "/api/admin/villas",
            json={
                "name": "Villa Menunggu Owner",
                "location": "Yogyakarta",
            },
            headers=self.admin_headers,
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["owner_user_id"], None)
        cursor.execute.assert_called_once()
        _, params = cursor.execute.call_args.args
        self.assertIsNone(params[17])


if __name__ == "__main__":
    unittest.main()
