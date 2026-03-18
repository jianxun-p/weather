import crypto from 'crypto';

export function validateExportAuth(req, res) {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized', ok: false, error_code: 401 });
        return false;
    }
    const a = Buffer.from(auth ?? '', 'utf-8')
    const b = Buffer.from(`Bearer ${process.env.EXPORT_PASSWORD}`, 'utf-8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        res.status(401).json({ error: 'Unauthorized', ok: false, error_code: 401 });
        return false;
    } 
    return true;
}

export function exportHistory(history) {
    return "data:text/csv;base64," + Buffer.from(
        [
            ['id', 'uid', 'name', 'latitude', 'longitude', 'notes', 'created_at', 'updated_at', 'weather'].join(','),
            ...history.map(h => [h.id, h.uid, `"${h.name.replace(/"/g, '""')}"`, h.latitude, h.longitude, h.notes, h.created_at, h.updated_at, `"${h.weather.replace(/"/g, '""')}"`].join(','))
        ].join('\n')
    , 'utf-8').toString('base64');
}
