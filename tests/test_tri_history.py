import unittest

from app.Code.benchmarks.tri_history import fetch_tri_index_history, tri_data_available


class TestTriHistory(unittest.TestCase):
    def test_sample_tri_files_do_not_override_nav_proxies(self):
        self.assertFalse(tri_data_available("nifty_500_tri"))
        self.assertEqual(fetch_tri_index_history("nifty_500_tri"), {})


if __name__ == "__main__":
    unittest.main()
