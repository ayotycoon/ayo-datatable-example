import { BehaviorSubject } from 'rxjs';
/*
@author Sunmola Ayokunle
@version 1.0.1
@docs https://www.npmjs.com/package/inn-datatable
@lastModified 27 March 2020

*/

import {  SubscriptionLike } from 'rxjs';
import { Observable } from 'rxjs';
import { Component, OnInit, Input, Output, EventEmitter,   } from '@angular/core';

import { Options, Head } from '../../types'


@Component({
  selector: 'inn-datatable',
  templateUrl: './datatable.component.html',
  styleUrls: ['./datatable.component.scss']
})

export class DatatableComponent implements OnInit {
  @Input() tableContainerClass: string;
  @Input() tableClass: string;
  @Input() options: Options;
  @Input() heads: Head[];
  hideAbleHeads: Head[] = [];
  @Input() bodyrows: any[];
  @Input() dataChanged: BehaviorSubject<boolean>;
  @Output() feedback: EventEmitter<{ type: string; action?: string; data: any[] }> = new EventEmitter<any>(null);


  noOfRows = [10]
  refreshing = false;
  cache = {
    checkBoxHeadId: ''
  };


  headHash: { sorted: boolean, isHidden: boolean } = {} as any;
  tableId = 'a' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  paginate = 10;
  paginateIndex = 1;
  paginateArrayIndex = 1;
  totalAvailablePagination = 1;

  staticBodyrows = [];

  subs: SubscriptionLike[] = [];

  paginatedBodyrows = [];
  selectedrows = [];

  constructor(// private ref
    ) { }
  logger = (text: string, color?: string) => {
  
    if (this.options && this.options.debug) {
      console.log(`%c ${text}`, 'color:' + (color || 'blue'));
    }
  }
  ngOnInit() {
    if (this.options ) {

      if(this.options.noOfRowsToDisplay){
        this.paginate = this.options.noOfRowsToDisplay
        this.noOfRows = [this.paginate]
      }
      if(this.options.debug){
        this.logger('Debug mode is on. do not forget to turn it off when you are done', 'red')
        

      }


    }

    if (this.dataChanged) {
      this.subs.push(this.dataChanged.subscribe(changed => {


        if (changed) {
          this.refreshing = true;

          this.logger('detected data change');

          setTimeout(() => {
            this.refreshing = false;
            this.staticBodyrows = this.bodyrows ? [...this.bodyrows] : [];
            this.paginateIndex = 1;
            this.paginateArrayIndex = 1;

     


            this.initializeTable();
         //    this.ref.detectChanges()

          }, 1000);
        }
      }));
    }
    this.selectedrows = [];
    this.staticBodyrows = this.bodyrows ? [...this.bodyrows] : [];
    this.initializeTable();
 //    this.ref.detectChanges()

  }

  toggleHide = (headData: Head) => {
    this.headHash[headData.key].isHidden = !this.headHash[headData.key].isHidden;
  }

  headClicked = (headData: Head, refElement?) => {
    switch (headData.key) {
      case 'checkbox':
        this.cache.checkBoxHeadId = refElement;
        const checked = (document.querySelector(
          '#' + refElement
        ) as HTMLInputElement).checked;


        document
          .querySelector('#' + this.tableId)
          .querySelectorAll('.checkbox')
          .forEach(
            (checkbox: HTMLInputElement) =>
              (checkbox.checked = !checked)
          );
        if (checked) {
          this.selectedrows = [];
        } else {
          this.selectedrows = [...this.paginatedBodyrows];
        }

        this.feedback.emit({ type: 'selectedrows', data: this.selectedrows });
        break;

      default:
        const sorted = this.headHash[headData.key].sorted;

        this.bodyrows.sort((a: any, b: any) => {
          if (sorted) {
            this.headHash[headData.key] = { sorted: false };
            const temp = a;
            a = b;
            b = temp;
          } else {
            this.headHash[headData.key] = { sorted: true };
          }
          let type = headData.type
          if (!headData.type) {
            // possibly a number
            if (parseInt(this.getData(headData.key, a)) && parseInt(this.getData(headData.key, b))) {
              type = 'number'
            } else {
              type = 'string'
            }
          }


          switch (type) {
            case 'number':
              return a[headData.key] - b[headData.key];
            case 'date':
              return (Number(new Date(a[headData.key])) || 0) - (Number(new Date(b[headData.key])) || 0);
            case 'string':
              const nameA = this.getData(headData.key, a) ? (this.getData(headData.key, a) + '').toUpperCase() : ''; // ignore upper and lowercase
              const nameB = this.getData(headData.key, b) ? (this.getData(headData.key, b) + '').toUpperCase() : ''; // ignore upper and lowercase
              if (nameA < nameB) {
                return -1;
              }
              if (nameA > nameB) {
                return 1;
              }

              // names must be equal
              return 0;


            default:
              break;
          }




        });
        this.startPaginate();

        break;
    }
    const el = document.querySelector('#' + headData.key + '-icon');
    if (!el) {
      return;
    }
    if (this.headHash[headData.key].sorted) {
      el.innerHTML = `  <i class='fa  fa-angle-up'></i>`;
    } else {
      el.innerHTML = `  <i class='fa  fa-angle-down'></i>`;
    }


  }
  initializeTable = () => {


    if ((this.bodyrows || []).length > this.paginate) {


      this.noOfRows = []

      for (let i = 1; i <= Math.ceil(this.bodyrows.length / this.paginate); i++) {
        this.noOfRows.push(this.paginate * i)

      }

    }

    this.heads.forEach(head => {
      if(head.hideable && !this.headHash[head.key]){
        this.hideAbleHeads.push(head);
      }
      this.headHash[head.key] = { sorted: false, isHidden: false };



    });
    this.startPaginate(true);
  }
  startPaginate = (init?) => {
    if (!this.bodyrows) {
      return;
    }
    if (init) {
      this.totalAvailablePagination = Math.ceil(
        this.bodyrows.length / this.paginate
      ) || 1;
    }

    this.paginatedBodyrows = this.bodyrows.slice(
      this.paginateArrayIndex - 1,
      this.paginate + (this.paginateArrayIndex - 1)
    );

    this.paginatedBodyrows.forEach((_, bodyIndex) => {
      if (_.checkbox) {
        this.selectedrows.push({ ..._, bodyIndex })
      }

    })



  }
  nextPaginate(n, forced?: number) {
    if (forced && typeof forced !== 'number') {
      return;
    }
    if (forced) {
      this.paginateIndex = forced;
      this.paginateArrayIndex = (forced * this.paginate);
    } else {
      this.paginateIndex += (n);
      this.paginateArrayIndex += (n * this.paginate);
    }

    this.startPaginate();
    this.resetCheckBox();
  }
  changePagination(n) {
    this.paginate = parseInt(n);
    this.paginateIndex = 1;
    this.paginateArrayIndex = 1;
    this.initializeTable();
  }
  search(searchInput) {
    this.bodyrows = this.staticBodyrows.filter(obj => {
      let match = false;
      for (const key of Object.keys(obj)) {
        if ((obj[key] + '').toLowerCase().match(searchInput.trim().toLowerCase())) {
          match = true;
          break;
        }
      }

      return match;
    });
    this.startPaginate(true);
  }
  resetCheckBox() {
    if (this.cache.checkBoxHeadId) {
      const refElement = this.cache.checkBoxHeadId;

      (document.querySelector(
        '#' + refElement
      ) as HTMLInputElement).checked = false;
    }
  }
  itemChecked(data, checked, bodyIndex) {
    if (checked) {
      this.selectedrows.push({ ...data, bodyIndex });
    } else {

      this.selectedrows = this.selectedrows.filter(rdata => !(rdata.bodyIndex === bodyIndex)
      );
    }
    this.feedback.emit({ type: 'selectedrows', data: this.selectedrows });
    this.resetCheckBox();


  }
  emitSingleAction(action, data) {
    this.feedback.emit({ type: 'singleaction', action, data });

  }
  emitBulkAction(action) {
    this.feedback.emit({ type: 'bulkactions', action, data: this.selectedrows });

  }
  min(a, b) {
    return Math.min(a, b);
  }


  emitViewActions(data, key) {

    if (key === 'checkbox' || key === 'action') {
      return;
    }
    if (this.options.emitClickActions) {
      this.options.emitClickActions.forEach(action => this.feedback.emit({ type: 'singleaction', action, data }));
      return;
    }
    ['View/Edit', 'View / Edit', 'View', 'Edit'].forEach(action => this.feedback.emit({ type: 'singleaction', action, data }));

  }
  getData(key, rowData) {
    const periodArr = key.split('.');
    if (periodArr) {
      let stageData = rowData;
      periodArr.forEach((eachPeriod) => {
        if (stageData) {
          stageData = stageData[eachPeriod];
        }


      });

      return stageData;


    }

    return rowData[key];

  }
  populateShortcutPagnation(start, end) {
    const a = 5;
    // this.paginateIndex
    const arr = [];

    for (let i = start; i <= end; i++) {
      arr.push(i);

    }

    return arr;
  }
  mouseOverPagnation($event) {
    const el = $event.target.querySelector('.pagnate-display');
    if (!el || !$event) {
      return;
    }
    el.style.top = `-${el.clientHeight}px`;
    el.style.left = `-${(el.clientWidth / 2) - ($event.target.clientWidth / 2)}px`;
  }
  processFieldWithPipe(pipe, field) {
    if (!pipe.pipe) {
      this.logger('Cannot find pipe function');
      return '';
    }

    return pipe.pipe.transform(field, ...pipe.args);




  }
  OnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
  }
}
