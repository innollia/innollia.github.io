"""python -m unittest tools/test_build_chronicle.py"""
import io, json, sys, unittest, urllib.error
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).parent))
from build_chronicle import PRIVATE, PUBLIC, RETRIES, SEALED, clean, combine, merge, read_record, request, to_kst


def base():
    entry = {'id': 'old', 's': 'sn', 't': '2026-09-26T18:29', 'cf': 'x', 'b': '', 'c': '', 'n': 3, 'bd': '옛글'}
    return {'v': 1, 'gen': 'x', 'gate': {}, 'topics': [], 'wh': {'k': 1}, 'heat': {'2026-09-26': 1},
            'stats': {'n': 1, 'sealed': 0, 'src': {'sn': 1}, 'chars': 3, 'first': entry['t'], 'last': entry['t'], 'imgs': 7},
            'entries': [entry]}


def record(**over):
    return {'id': 'page-1', 'title': '제목', 'text': '본문', 'blog': PUBLIC, 'type': '메모', 'status': 'synced',
            'when': '2026-10-01T01:00:00.000Z', 'ledgers': ['L'], 'archived': False, **over}


LEDGERS = {'L': {'title': '260925', 'blog': '', 'tags': ['메모']}}


def build(*records, ledgers=LEDGERS, body=lambda r: ''):
    return merge(base(), list(records), ledgers, body)


class Gate(unittest.TestCase):
    def test_blank_before_default_stays_private(self):
        self.assertEqual(len(build(record(blog=''))['entries']), 1)

    def test_blank_is_public_from_default(self):
        got = build(record(blog='', when='2026-11-04T15:00:00.000Z'))
        self.assertEqual(got['entries'][-1]['bd'], '본문')

    def test_date_only_counts_from_default(self):
        self.assertEqual(len(build(record(blog='', when='2026-11-05'))['entries']), 2)

    def test_private_mark_beats_default(self):
        self.assertEqual(len(build(record(blog=PRIVATE, when='2026-11-05T01:00:00.000Z'))['entries']), 1)

    def test_private_board_beats_default(self):
        got = build(record(blog='', when='2026-11-05T01:00:00.000Z'), ledgers={'L': dict(LEDGERS['L'], blog=PRIVATE)})
        self.assertEqual(len(got['entries']), 1)

    def test_unknown_value_stays_private(self):
        self.assertEqual(len(build(record(blog='공개할까'))['entries']), 1)

    def test_board_mark_is_inherited(self):
        got = build(record(blog=''), ledgers={'L': dict(LEDGERS['L'], blog=PUBLIC)})
        self.assertEqual(got['entries'][-1]['bd'], '본문')

    def test_record_mark_beats_board(self):
        got = build(record(blog=SEALED), ledgers={'L': dict(LEDGERS['L'], blog=PUBLIC)})
        self.assertIn('z', got['entries'][-1])

    def test_before_cutoff_belongs_to_snapshot(self):
        self.assertEqual(len(build(record(when='2026-09-26T14:59:00.000Z'))['entries']), 1)

    def test_cutoff_is_in_kst(self):
        self.assertEqual(len(build(record(when='2026-09-26T15:00:00.000Z'))['entries']), 2)

    def test_deleted_and_archived_are_dropped(self):
        self.assertEqual(len(build(record(status='deleted_on_discord'))['entries']), 1)
        self.assertEqual(len(build(record(archived=True))['entries']), 1)

    def test_private_body_is_never_read(self):
        def body(r):
            raise AssertionError('읽으면 안 된다')
        build(record(blog=''), body=body)


class Sealed(unittest.TestCase):
    def test_nothing_but_size_leaks(self):
        got = build(record(blog=SEALED, title='비밀 제목', text='비밀 본문'))['entries'][-1]
        self.assertNotIn('비밀', str(got))
        self.assertEqual(got['n'], 5)


class Merge(unittest.TestCase):
    def test_snapshot_is_untouched(self):
        got = build(record())
        self.assertEqual(got['entries'][0], base()['entries'][0])
        self.assertEqual((got['wh'], got['gate'], got['stats']['imgs']), ({'k': 1}, {}, 7))

    def test_stats_follow_entries(self):
        got = build(record(), record(id='page-2', blog=SEALED, when='2026-10-02T01:00:00.000Z'))
        self.assertEqual(got['stats']['n'], 3)
        self.assertEqual(got['stats']['sealed'], 1)
        self.assertEqual(got['stats']['src'], {'sn': 1, 'dc': 2})
        self.assertEqual(got['stats']['chars'], 3 + 2 + 2)
        self.assertEqual(got['stats']['last'], '2026-10-02T10:00')
        self.assertEqual(got['heat']['2026-10-01'], 1)

    def test_id_is_stable_between_builds(self):
        self.assertEqual(build(record())['entries'][-1]['id'], build(record())['entries'][-1]['id'])

    def test_empty_after_cleaning_is_skipped(self):
        self.assertEqual(len(build(record(text='![a](https://x/y.png)'))['entries']), 1)

    def test_body_comes_from_page_too(self):
        got = build(record(text='앞'), body=lambda r: '뒤')
        self.assertEqual(got['entries'][-1]['bd'], '앞\n\n뒤')


class Text(unittest.TestCase):
    def test_combine_rules(self):
        self.assertEqual(combine('같은 글', '같은  글'), '같은 글')
        self.assertEqual(combine('짧은', '짧은 글 더'), '짧은 글 더')
        self.assertEqual(combine('', '뒤'), '뒤')

    def test_signed_urls_are_removed(self):
        text = clean('앞 https://cdn.discordapp.com/a/b.png?ex=1&hm=2 뒤 https://prod-files.s3.us-west-2.amazonaws.com/x?sig=1')
        self.assertNotIn('http', text)

    def test_time(self):
        self.assertEqual(to_kst('2026-10-01T15:30:00.000Z'), '2026-10-02T00:30')
        self.assertEqual(to_kst('2026-10-01'), '2026-10-01T00:00')


class Read(unittest.TestCase):
    def test_missing_blog_column_reads_as_private(self):
        page = {'id': 'p', 'created_time': '2026-10-01T00:00:00.000Z', 'properties': {}}
        got = read_record(page)
        self.assertEqual(got['blog'], '')
        self.assertEqual(got['when'], '2026-10-01T00:00:00.000Z')


class Rate(unittest.TestCase):
    @staticmethod
    def limited():
        return urllib.error.HTTPError('u', 429, 'slow', {'Retry-After': '0'}, None)

    def test_waits_out_rate_limit(self):
        with mock.patch('urllib.request.urlopen', side_effect=[self.limited(), io.BytesIO(json.dumps({'ok': 1}).encode())]):
            self.assertEqual(request('t', 'GET', '/x'), {'ok': 1})

    def test_gives_up_after_retries(self):
        with mock.patch('urllib.request.urlopen', side_effect=[self.limited() for _ in range(RETRIES)]):
            with self.assertRaises(urllib.error.HTTPError):
                request('t', 'GET', '/x')


if __name__ == '__main__':
    unittest.main()
