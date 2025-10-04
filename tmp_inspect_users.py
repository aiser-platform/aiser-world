from app.db.session import get_sync_engine
import sqlalchemy as sa
eng = get_sync_engine()
uid='4e3bd925-6ae6-49fa-82d6-5e7957958cf0'
with eng.connect() as conn:
    try:
        r = conn.execute(sa.text('SELECT id::text AS id_text, legacy_id, username, email, created_at FROM users WHERE id = :uid'), {'uid': uid})
        row = r.fetchone()
        print('by id:', bool(row))
        print(row)
    except Exception as e:
        print('error by id', e)
    try:
        r2 = conn.execute(sa.text('SELECT id::text AS id_text, legacy_id, username, email, created_at FROM users WHERE legacy_id = :legacy'), {'legacy': 6})
        rows = r2.fetchall()
        print('by legacy count', len(rows))
        for rr in rows:
            print(rr)
    except Exception as e:
        print('error by legacy', e)
    try:
        q2 = "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position"
        cols = conn.execute(sa.text(q2)).fetchall()
        print('users columns:')
        for c in cols:
            print(c)
    except Exception as e:
        print('error cols', e)
