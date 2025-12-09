from socketio import AsyncServer

sio = AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',  # Configure properly for production
    logger=True,
    engineio_logger=True
)

# Store active connections
active_rooms = {}

@sio.on('connect')
async def connect(sid, environ):
    print(f'Client connected: {sid}')

@sio.on('disconnect')
async def disconnect(sid):
    print(f'Client disconnected: {sid}')
    # Clean up user from all rooms
    for room in list(active_rooms.keys()):
        if sid in active_rooms.get(room, []):
            active_rooms[room].remove(sid)
            await sio.emit('user:left', {'user_id': sid}, room=room, skip_sid=sid)

@sio.on('join_dashboard')
async def join_dashboard(sid, data):
    """User joins a dashboard collaboration room"""
    dashboard_id = data.get('dashboard_id')
    user_info = data.get('user', {})
    
    # Join room
    await sio.enter_room(sid, f'dashboard:{dashboard_id}')
    
    # Track in active rooms
    room_key = f'dashboard:{dashboard_id}'
    if room_key not in active_rooms:
        active_rooms[room_key] = []
    active_rooms[room_key].append(sid)
    
    # Load current dashboard state from DB
    try:
        from app.modules.dashboards.service import get_dashboard
        dashboard = await get_dashboard(dashboard_id)
    except Exception as e:
        print(f"Error loading dashboard: {e}")
        dashboard = None
    
    # Send current state to joining user
    await sio.emit('dashboard:state', {
        'dashboard': dashboard,
        'active_users': len(active_rooms[room_key])
    }, to=sid)
    
    # Notify others
    await sio.emit('user:joined', {
        'user': user_info,
        'active_users': len(active_rooms[room_key])
    }, room=room_key, skip_sid=sid)

@sio.on('leave_dashboard')
async def leave_dashboard(sid, data):
    """User leaves dashboard"""
    dashboard_id = data.get('dashboard_id')
    room_key = f'dashboard:{dashboard_id}'
    
    await sio.leave_room(sid, room_key)
    
    if room_key in active_rooms and sid in active_rooms[room_key]:
        active_rooms[room_key].remove(sid)
    
    await sio.emit('user:left', {
        'user_id': sid,
        'active_users': len(active_rooms.get(room_key, []))
    }, room=room_key)

@sio.on('widget:update')
async def update_widget(sid, data):
    """Widget updated by user"""
    dashboard_id = data.get('dashboard_id')
    widget_id = data.get('widget_id')
    changes = data.get('changes')
    
    # Save to database (async)
    try:
        from app.modules.dashboards.service import update_widget
        await update_widget(dashboard_id, widget_id, changes)
    except Exception as e:
        print(f"Error saving widget: {e}")
    
    # Broadcast to others in room
    await sio.emit('widget:update', {
        'widget_id': widget_id,
        'changes': changes,
        'user_id': sid
    }, room=f'dashboard:{dashboard_id}', skip_sid=sid)

@sio.on('widget:add')
async def add_widget(sid, data):
    """New widget added"""
    dashboard_id = data.get('dashboard_id')
    widget = data.get('widget')
    
    # Save to database
    try:
        from app.modules.dashboards.service import add_widget
        saved_widget = await add_widget(dashboard_id, widget)
        widget = saved_widget
    except Exception as e:
        print(f"Error adding widget: {e}")
    
    # Broadcast
    await sio.emit('widget:add', {
        'widget': widget,
        'user_id': sid
    }, room=f'dashboard:{dashboard_id}', skip_sid=sid)

@sio.on('widget:remove')
async def remove_widget(sid, data):
    """Widget removed"""
    dashboard_id = data.get('dashboard_id')
    widget_id = data.get('widget_id')
    
    # Delete from database
    try:
        from app.modules.dashboards.service import delete_widget
        await delete_widget(dashboard_id, widget_id)
    except Exception as e:
        print(f"Error deleting widget: {e}")
    
    # Broadcast
    await sio.emit('widget:remove', {
        'widget_id': widget_id,
        'user_id': sid
    }, room=f'dashboard:{dashboard_id}', skip_sid=sid)

# Export for FastAPI mounting
def get_socketio_app():
    return sio
