# Known Pitfalls

Lỗi đã từng phát hiện. Cập nhật khi vấn đề lặp lại để không phải re-discover.

## Trống — đợi audit pass đầu tiên.

(Khi thêm mục mới, dùng format:)

```
### <YYYY-MM-DD> — <tóm tắt lỗi>
- **Nơi**: <file:line / area>
- **Severity**: info | warn | error | critical
- **Triệu chứng**:
- **Nguyên nhân gốc**:
- **Cách phát hiện** (cho audit lần sau):
- **Fix do owner agent thực hiện**: <link finding id / commit>
```
