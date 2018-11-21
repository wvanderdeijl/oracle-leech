set linesize 140

column startup_time        format a30
column begin_interval_time format a30
column end_interval_time   format a30

select snap_id, startup_time, begin_interval_time, end_interval_time
from dba_hist_snapshot order by 1,2;

select distinct dbid, instance_number from dba_hist_snapshot;

exec dbms_workload_repository.create_snapshot;


-- databaseid, instanceid, fromsnapshot, tosnapshot
select output from table(dbms_workload_repository.awr_report_text(2873559607,  1, 1, 2));
select output from table(dbms_workload_repository.awr_sql_report_text(2873559607,  1, 1, 2));


select ora_rowscn, count(*) from demo group by ora_rowscn;

set linesize 130
set pagesize 0

exec dbms_stats.gather_schema_stats('SYSTEM',dbms_stats.auto_sample_size);

explain plan for select count(*) from demo where ora_rowscn > 1780860;
select * from table(dbms_xplan.display);

explain plan for select * from demo where ora_rowscn > 1780860;
select * from table(dbms_xplan.display);

explain plan for select count(*) from demo where id < 5;
select * from table(dbms_xplan.display);

select * from dba_change_notification_regs;
select * from dba_cq_notification_queries;

exec dbms_cq_notification.deregister(602);

update demo set txt='f' where rownum < 3;
commit;
delete from demo where rownum =1;
commit;

update demo set txt='b' where rownum < 3;
delete from demo where rownum =1;
commit;

-- updating 1M rows creates about 135 log switches
-- testing without any query notification runs from 319 to 433 (114)
-- next run (with CQ) runs from 463 to 578 (115) so no impact of having CQ


-- what notification is sent when moving rows?
alter table demo move; -- gives full table refresh notification (without rowsids)
