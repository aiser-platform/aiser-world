from sqlalchemy import create_engine, text
import os

WORLD='postgresql+psycopg2://aiser:aiser_password@postgres:5432/aiser_world'
CHAT='postgresql+psycopg2://aiser:aiser_password@postgres:5432/aiser_chat2chart'
we=create_engine(WORLD)
ce=create_engine(CHAT)

# build mapping
mapping={}
with we.connect() as w, ce.connect() as c:
    rows = w.execute(text('SELECT id, username, email FROM users')).fetchall()
    for lid,uname,email in rows:
        r = c.execute(text('SELECT id FROM users WHERE username=:u OR email=:e LIMIT 1'),{'u':uname,'e':email}).fetchone()
        if r:
            mapping[int(lid)]=str(r[0])
print('mapping count:', len(mapping))

tables=[('dashboard_embeds','created_by'),('user_organizations','user_id'),('refresh_tokens','user_id'),('dashboard_shares','shared_by'),('dashboard_shares','shared_with'),('dashboard_analytics','user_id'),('device_sessions','user_id')]

for table,col in tables:
    print('\n---',table,col)
    try:
        with ce.begin() as conn:
            print('adding column')
            conn.execute(text(fALTER
