-- 正式 migration 流程的 baseline 標記。
--
-- CryptoPets 專案一開始以 schema 快照建立資料庫，因此初始資料庫結構
-- 記錄在 ../schema.sql。新環境應先執行 schema.sql，再依檔名字典序
-- 套用本目錄中的 migrations。
--
-- 本檔刻意保持可重複執行且輕量，讓既有資料庫可以採用編號 migration
-- 流程，而不需要重新建立已存在的資料表。

create extension if not exists pgcrypto;
