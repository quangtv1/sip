# Phase 02 — Font Size + Deploy

## Files
- `frontend/src/pages/system-config/sheet-section.jsx`
- Docker rebuild nginx

## sheet-section.jsx changes

### Table size
```jsx
// Before
<Table ... size="small" />
// After
<Table ... size="middle" />
```

### Cell font sizes
| Location | Before | After |
|----------|--------|-------|
| viewColumns: #, required | fontSize: 12 | fontSize: 14 |
| viewColumns: name (code) | fontSize: 12 | fontSize: 14 |
| viewColumns: label | fontSize: 12 | fontSize: 14 |
| viewColumns: type Tag | fontSize: 11 | fontSize: 13 |
| viewColumns: severity Tag | fontSize: 10 | fontSize: 12 |
| TypeParamsView all | fontSize: 11 | fontSize: 13 |
| editColumns: # | fontSize: 12 | fontSize: 14 |

### Column widths (scale up for middle size)
| Column | Before | After |
|--------|--------|-------|
| # | 36 | 44 |
| name | 140 | 160 |
| label | 200 | 220 |
| type | 120 | 140 |
| required | 100 | 120 |
| Tham số | 200 | 220 |
| severity | 80 | 90 |
| scroll x (view) | 900 | 1000 |
| scroll x (edit) | 1060 | 1150 |

## Deploy
```bash
docker-compose build --no-cache nginx
docker stop sip_nginx_1 && docker rm sip_nginx_1
docker-compose up -d nginx
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/
```

## Success Criteria
- [ ] Table cells use 14px font
- [ ] Table `size="middle"` — comfortable row height
- [ ] Column widths proportional
- [ ] App serves 200 OK after rebuild
