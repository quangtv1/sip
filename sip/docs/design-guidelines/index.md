# Thiết kế giao diện — Design Guidelines

**Dự án:** SIP (Submission Information Package)  
**Phiên bản:** 1.0  
**Ngôn ngữ:** Tiếng Việt  
**Framework:** React 18 + Ant Design v5  
**Cập nhật:** 2026-04-26

---

## Tổng quan

SIP sử dụng **Navy + Teal theme** — thiết kế chuyên nghiệp, thanh lịch cho ngành lưu trữ số. Hướng dẫn này định nghĩa design system đầy đủ, bao gồm color tokens, layout patterns, component patterns, và UX principles.

## Các phần chính

- **[Visual Language & Layout](./visual-language.md)** — Navy/Teal palette, bố cục grid, typography
- **[Ant Design Theme Setup](./theme-setup.md)** — Cấu hình ConfigProvider, design tokens
- **[Layout Components](./layout-components.md)** — Header, footer, 2-column grid, responsive
- **[Screen Patterns](./screen-patterns.md)** — Upload, validate, queue, detail, approval, dashboard
- **[Reusable Components](./reusable-components.md)** — StatusTag, SeverityBadge, MonoText, EditableCell
- **[UX Principles](./ux-principles.md)** — No confirmation, block on error, visual feedback, readonly
- **[Form & Validation](./form-validation.md)** — Form patterns, validation rules, error handling
- **[Color Reference](./color-reference.md)** — Palette, semantic meanings, usage examples

## Bắt đầu nhanh

1. Copy `themeConfig` từ [theme-setup.md](./theme-setup.md) vào `main.tsx`
2. Wrap `<ConfigProvider theme={themeConfig}>` quanh app
3. Sử dụng Ant Design components như được mô tả trong [layout-components.md](./layout-components.md)
4. Follow patterns trong [screen-patterns.md](./screen-patterns.md) cho mỗi màn hình

---

**Tài liệu tham khảo:**
- Ant Design v5: https://ant.design/
- OAIS SIP: https://www.oais.info/
- Thông tư 05/TT-BNV: Tiêu chuẩn lưu trữ số Việt Nam
