/**
 * app.tour-steps.ts
 *
 * Tour step definitions สำหรับแต่ละ tab ของ Onboarding Tour
 * แยกออกมาจาก app.ts เพื่อให้ app.ts กระชับขึ้นและง่ายต่อการบำรุงรักษา
 *
 * วิธีใช้งาน:
 *   import { TOUR_STEPS } from './app.tour-steps';
 *   this.tourService.startTour(tabId, TOUR_STEPS[tabId], force);
 */

import { TourStep } from './services/onboarding-tour.service';

export const TOUR_STEPS: Record<string, TourStep[]> = {

  'paired-courses': [
    {
      targetSelector: '.action-right-btns .btn-add-primary, .btn-add-primary',
      title: 'ปุ่มเพิ่มกลุ่มวิชาคู่',
      description:
        'คลิกปุ่มนี้เมื่อต้องการสร้างกลุ่มวิชาเทียบเท่า (วิชาเดียวกันที่มีการปรับรหัสหรือชื่อตามช่วงปีหลักสูตร) โดยสามารถเลือกค้นหาจากหมวดตัวอักษรด้านข้างขวาได้',
      icon: 'add_circle',
      position: 'bottom',
      actionHint: 'สามารถเพิ่มวิชาคู่ได้ตั้งแต่ 2 วิชาขึ้นไป',
    },
    {
      targetSelector: '.action-bar .search-box, .search-box',
      title: 'กล่องค้นหากลุ่มวิชา',
      description:
        'พิมพ์รหัสวิชา เช่น ACC1101 หรือหมายเลขกลุ่ม เพื่อค้นหากลุ่มวิชาคู่ที่ต้องการได้อย่างรวดเร็ว',
      icon: 'search',
      position: 'bottom',
    },
    {
      targetSelector: '.data-table, .table-responsive',
      title: 'ตารางแสดงความสัมพันธ์วิชาคู่',
      description:
        'แสดงรายการวิชาที่จับคู่เทียบเท่ากัน พร้อมช่วงปีหลักสูตร (เช่น ปี 65-68), ชั้นปี และภาคการศึกษา',
      icon: 'sync_alt',
      position: 'top',
    },
    {
      targetSelector: '.col-actions, .btn-delete',
      title: 'การลบและจัดเก็บประวัติ (HIS)',
      description:
        'เมื่อกดลบกลุ่มวิชาคู่ ระบบจะสำรองประวัติทุกวิชาลงในตาราง HIS ก่อนลบออกจากระบบเสมอ ปลอดภัย 100%',
      icon: 'history_edu',
      position: 'left',
    },
  ],

  'course-search': [
    {
      targetSelector: '.sem-selector-container, .select-trigger-btn',
      title: 'เลือกปีและภาคการศึกษา',
      description:
        'คลิกเพื่อเลือกดูและจัดการรายวิชาที่เปิดสอนตามปีและภาคการศึกษาที่ต้องการ',
      icon: 'event_available',
      position: 'bottom',
    },
    {
      targetSelector: '.action-right-btns .btn-add-primary, .btn-add-primary',
      title: 'เพิ่มวิชาที่เปิดสอน',
      description:
        'คลิกเพื่อเปิดหน้าต่างเลือกวิชา โดยสามารถเลือกตัวอักษรนำหน้า (A, B, C...) และเลือกหลายวิชาพร้อมกันได้',
      icon: 'library_add',
      position: 'bottom',
    },
    {
      targetSelector: '.action-bar .search-box, .search-box',
      title: 'ค้นหารายวิชาในตาราง',
      description: 'ค้นหาด้วยรหัสวิชา ชื่อวิชา หรือหมายเหตุ',
      icon: 'search',
      position: 'bottom',
    },
    {
      targetSelector: '.data-table, .table-responsive',
      title: 'ตารางรายวิชาที่เปิดสอน',
      description:
        'แสดงรายการวิชาที่เปิดสอน สามารถติ๊กเลือกหลายวิชาพร้อมกันเพื่อทำการลบแบบกลุ่มได้',
      icon: 'table_chart',
      position: 'top',
    },
  ],

  'curriculum': [
    {
      targetSelector: '.action-right-btns .btn-primary, .btn-primary.btn-icon-only',
      title: 'เพิ่ม/จัดการวิชาในหลักสูตร',
      description:
        'คลิกปุ่มบวก (+) เพื่อเปิดหน้าต่างกำหนดรายวิชาตามแผนการเรียน โดยสามารถเลือกคณะ, สาขาวิชา, กลุ่มวิชาย่อย, ชั้นปี (1-4) และภาคเรียน พร้อมค้นหาและเพิ่มรายวิชาเข้าสู่หลักสูตร',
      icon: 'menu_book',
      position: 'bottom',
      actionHint: 'คลิกปุ่มบวก (+) เพื่อเริ่มจัดการรายวิชาในหลักสูตร',
    },
    {
      targetSelector: '.curriculum-filters-container',
      title: 'ตัวกรองคณะและกลุ่มสาขาวิชา',
      description:
        'เลือกคณะเพื่อแสดงเฉพาะกลุ่มวิชาในคณะนั้น และเลือกกลุ่มสาขาวิชาเพื่อเจาะจงข้อมูลหลักสูตรที่ต้องการตรวจสอบ',
      icon: 'filter_alt',
      position: 'bottom',
    },
    {
      targetSelector: '.action-bar .search-box, .search-box',
      title: 'ค้นหากลุ่มหลักสูตร',
      description:
        'พิมพ์ค้นหาชื่อกลุ่มวิชา, กลุ่มวิชาย่อย, คณะ หรือรหัสวิชา เพื่อค้นหาข้อมูลในตารางได้อย่างรวดเร็ว',
      icon: 'search',
      position: 'bottom',
    },
    {
      targetSelector: '.data-table, .table-responsive',
      title: 'ตารางกลุ่มหลักสูตรตามโครงสร้าง',
      description:
        'แสดงรายการกลุ่มวิชาและกลุ่มวิชาย่อยทั้งหมดที่สังกัดคณะ พร้อมป้ายระบุกลุ่มวิชาหลักและกลุ่มวิชาย่อยชัดเจน',
      icon: 'account_tree',
      position: 'top',
    },
    {
      targetSelector: '.col-actions .btn-action.btn-more, .btn-action.btn-more, .context-clickable-row',
      title: 'การจัดการกลุ่มวิชา (ปุ่ม 3 จุด / คลิกขวา)',
      description:
        'คลิกปุ่ม 3 จุด หรือคลิกขวาที่แถวใดก็ได้ เพื่อเลือก: 1) ดูรายชื่อวิชาทั้งหมดในกลุ่มหลักสูตร (ไอคอนตา), 2) จัดการวิชาในกลุ่ม (เปิดหน้าต่างเพิ่ม/ลบวิชา), หรือ 3) ลบกลุ่มหลักสูตร',
      icon: 'more_vert',
      position: 'left',
      actionHint: 'คลิกขวาบนแถวเพื่อเปิดเมนูจัดการด่วนได้',
    },
  ],

  'academic-year': [
    {
      targetSelector: '.action-right-btns .btn-primary, .btn-primary.btn-icon-only',
      title: 'เพิ่มปีและภาคการศึกษา',
      description:
        'คลิกปุ่มบวก (+) เพื่อเปิดหน้าต่างเพิ่มปีการศึกษาใหม่ (เช่น 2569) และเลือกภาคเรียน (ภาค 1 หรือ ภาค 2) พร้อมกำหนดให้เป็นปีภาคที่ใช้งานได้ทันที',
      icon: 'calendar_add_on',
      position: 'bottom',
      actionHint: 'คลิกเพื่อเปิดหน้าต่างกรอกข้อมูลปีภาค',
    },
    {
      targetSelector: '.action-bar .search-box, .search-box',
      title: 'ค้นหาปีภาคการศึกษา',
      description:
        'พิมพ์ค้นหาปีการศึกษา เช่น "2569" หรือ "ภาค 1" เพื่อกรองข้อมูลในตารางได้อย่างรวดเร็ว',
      icon: 'search',
      position: 'bottom',
    },
    {
      targetSelector: '.action-right-btns .btn-refresh, .btn-refresh',
      title: 'รีเฟรชข้อมูล',
      description: 'กดปุ่มนี้เพื่อดึงข้อมูลปีภาคการศึกษาล่าสุดจากฐานข้อมูลใหม่อีกครั้ง',
      icon: 'refresh',
      position: 'bottom',
    },
    {
      targetSelector: '.col-status, .badge-active-sem, .btn-set-active',
      title: 'กำหนดปีภาคที่ใช้งานปัจจุบัน (Active Semester)',
      description:
        'แถวที่มีป้ายสีเขียวคือ "ปีภาคที่ใช้งานปัจจุบัน" ของระบบ คุณสามารถคลิกปุ่ม "กำหนดเป็นปีภาคที่ใช้งาน" ในแถวอื่นเพื่อสลับปีภาคหลักที่ใช้จัดตารางสอนได้ทันที',
      icon: 'check_circle',
      position: 'top',
    },
    {
      targetSelector: '.col-actions .btn-action.btn-more, .btn-action.btn-more, .context-clickable-row',
      title: 'ปุ่มจัดการและคลิกขวา (Context Menu)',
      description:
        'คลิกที่ปุ่ม 3 จุด หรือคลิกขวาที่แถวรายการใดก็ได้ เพื่อเปิดเมนูจัดการข้อมูล เช่น แก้ไขสถานะปีภาค หรือลบรายการ',
      icon: 'more_vert',
      position: 'left',
      actionHint: 'คลิกขวาบนแถวในตารางเพื่อเปิดเมนูด่วนได้เช่นกัน',
    },
  ],

  'instructor': [
    {
      targetSelector: '.action-bar-right .btn-primary, .btn-primary',
      title: 'เพิ่มอาจารย์ผู้สอน',
      description:
        'คลิกเพื่อเปิดหน้าต่างค้นหาและเลือกอาจารย์จากฐานข้อมูล UGB_INSTRUCTOR เพื่อเพิ่มเข้าสู่ภาคการศึกษานี้',
      icon: 'person_add',
      position: 'bottom',
    },
    {
      targetSelector: '.action-bar-left .search-box, .search-box',
      title: 'ค้นหาอาจารย์ในตาราง',
      description:
        'ค้นหาด้วยรหัสอาจารย์, ชื่อ-นามสกุล, ตำแหน่งทางวิชาการ หรือชื่อคณะ',
      icon: 'search',
      position: 'bottom',
    },
    {
      targetSelector: '.filter-select-wrapper',
      title: 'ตัวกรองคณะ',
      description: 'เลือกกรองเฉพาะอาจารย์ในคณะที่ต้องการตรวจสอบ',
      icon: 'account_balance',
      position: 'bottom',
    },
    {
      targetSelector: '.data-table, .table-responsive',
      title: 'ตารางรายชื่ออาจารย์ผู้สอน',
      description:
        'แสดงข้อมูลอาจารย์พร้อมตำแหน่งทางวิชาการ คณะ และประเภทอาจารย์ สามารถเลือกติ๊กลบหลายท่านพร้อมกันได้',
      icon: 'badge',
      position: 'top',
    },
  ],

  'timetable-manage': [
    {
      targetSelector: '.action-bar-right .btn-primary, .btn-primary',
      title: 'เพิ่มข้อมูลตารางสอน',
      description:
        'คลิกเพื่อเปิดหน้าต่างจัดตารางสอน เลือกกระบวนวิชา (มีระบบเลือก A-Z) วัน-เวลาเรียน ห้องเรียน และอาจารย์ผู้สอน พร้อมระบบแนะนำคาบเรียนจาก มร.30',
      icon: 'add_circle',
      position: 'bottom',
    },
    {
      targetSelector: '.day-filter-bar',
      title: 'ตัวกรองวันเรียนด่วน',
      description:
        'คลิกเลือกดูตารางสอนเฉพาะวัน เช่น วันจันทร์ วันอังคาร หรือดูทุกวันได้อย่างสะดวก',
      icon: 'calendar_view_week',
      position: 'bottom',
    },
    {
      targetSelector: '.action-bar-left .search-box, .search-box',
      title: 'ค้นหาตารางสอน',
      description: 'ค้นหาด้วยรหัสวิชา, ชื่อวิชา, ห้องเรียน หรือชื่ออาจารย์ผู้สอน',
      icon: 'search',
      position: 'bottom',
    },
    {
      targetSelector: '.data-table, .table-responsive',
      title: 'ตารางจัดการคาบสอน',
      description:
        'แสดงรายละเอียดวัน เวลา รหัสวิชา ห้องเรียน และรายชื่ออาจารย์ผู้สอนในแต่ละคาบ สามารถติ๊กเลือกหลายวิชาเพื่อทำการลบแบบกลุ่มได้',
      icon: 'table_view',
      position: 'top',
    },
  ],

  'student-schedule': [
    {
      targetSelector: '.filter-card',
      title: 'เลือกปีการศึกษา และห้องเรียน',
      description:
        'เลือกปี/ภาคการศึกษา และค้นหาห้องเรียนจากข้อมูลที่จัดตารางไว้ (RG_SCHEDULE_CLASS) หรือคลิกเลือกห้องที่เพิ่มล่าสุดด้านล่างได้อย่างรวดเร็ว',
      icon: 'meeting_room',
      position: 'bottom',
    },
    {
      targetSelector: '.btn-add-timetable-class, .filter-actions-group .btn-primary',
      title: 'ปุ่มเพิ่มตารางสอน (+)',
      description:
        'คลิกปุ่ม (+) เพื่อเปิดหน้าต่างเพิ่มข้อมูลตารางสอนใหม่ โดยสามารถเลือกกระบวนวิชา วัน คาบเวลา ห้องเรียน และอาจารย์ผู้สอน หรือคลิกที่ช่องว่างในตารางโดยตรงได้เช่นกัน',
      icon: 'add_circle',
      position: 'bottom',
    },
    {
      targetSelector: '.grid-control-right .btn-action-edit-mode, .btn-action-edit-mode',
      title: 'โหมดปรับเปลี่ยนตารางสอน (Drag & Drop)',
      description:
        'คลิกปุ่มนี้เพื่อเปิดโหมดปรับตาราง ท่านจะสามารถคลิกค้างแล้วลากกล่องวิชาไปวางในวันหรือเวลาอื่นได้อย่างอิสระ จากนั้นกดปุ่มบันทึกการเปลี่ยนแปลง',
      icon: 'drag_indicator',
      position: 'bottom',
    },
    {
      targetSelector: '.schedule-matrix-container, .matrix-table-wrapper',
      title: 'ตารางเมทริกซ์การใช้ห้องเรียน',
      description:
        'แสดงตารางสอนแบ่งตามวัน (จันทร์-อาทิตย์) และเวลาเรียน สามารถคลิกที่กล่องวิชาเพื่อเปิดดูรายละเอียดวิชาและรายชื่ออาจารย์ผู้สอนได้',
      icon: 'calendar_view_week',
      position: 'top',
    },
    {
      targetSelector: '.header-actions .btn-action-primary, .header-actions',
      title: 'ส่งออกไฟล์ CSV และพิมพ์ตารางเรียน',
      description:
        'สามารถกดพิมพ์ตารางเรียนแบบจัดหน้ากระดาษสวยงาม หรือส่งออกข้อมูลตารางเรียนของห้องนี้เป็นไฟล์ CSV ไปใช้งานต่อได้ทันที',
      icon: 'print',
      position: 'bottom',
    },
  ],
};
