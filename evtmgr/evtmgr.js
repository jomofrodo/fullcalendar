//For use with the fullcalendar library by Adam Shaw
//www.fullcalendar.com
var calendar;
var flgFirstClick;
var editTemplate;
var createTemplate;
var calendarID;  //Must be set in the parent page
var DIR_FC="/js/fullcalendar-1.6.2";
var DIV_ID="eventEdit";

var fmtDateTime =("YYYY/MM/DD HH:mm Z");
var fmtDisplay =("MM/DD/YYYY HH:mm");
var fmtDay = ("MM/DD/YYYY");
var fmtTime = ("h:mma");
var fmtFC = ("MM/DD/YYYY HH:mma");

var globEvent;
//Minimum dimensions for event create/edit dialog
var minHeight="350";
var minWidth="700";

function closeDialog(id){
	$('#' + id).dialog("close");
}

function closeEventCreate() {
	closeDialog(DIV_ID);
}
function closeEventEdit() {
	closeDialog(DIV_ID);
}

function contextMenu(event, element) {
	alert('context menu!');
}

function createFCEvent(f) {
	// create an event based on form data

	if(!f.evtTitle.value){
		alert ("The title field cannot be empty");
		return false;
	}
	// Send the event to the back end
	var url = "/cal?pAction=eventCreate";
	f.action = url;
	var event;
	var id;
	var fLoad = function(data) {
		event = evalJSON(data);
		// Times are passed through json as millisecond values.
		// These need to be converted into actual date objects.
		event.start = new Date(event.start);
		event.end = new Date(event.end);
		// render in the calendar
		calendar.fullCalendar('renderEvent', event, true // make the event
															// "stick"
		);
		id = event.id;
	}
	// var jqID = "#" + f.id;
	// $.post(url, $(jqID).serialize(), fLoad);
	xhrSubmit(f, true, fLoad);
	return id;
}

function createFCEventAndCloseDialog(f){
	var id = createFCEvent(f);
	if(! id) return false;
	closeDialog(DIV_ID);
}

function createAndEditEvent(f){
	var id = createFCEvent(f);

	if(!id) return false;
	closeEventCreate();
	var evt = {};
	evt.id = id;
	evt.calendarid = f.calendarID.value;
	evt.title = f.evtTitle.value;
	evt.start = f.evtStart.value;
	evt.end = f.evtEnd.value;
	var ad = f.allDay.value;
	evt.allDay = ad=="true"?true:false;
	editCalendarEvent(evt);

}



function dayClickHdlr(date, allDay, jsEvent, view) {
	  flgFirstClick=true;

	  //if(view.name != 'month')  return;

	  if(view.name == 'basicDay'){
		  showCreateFCEvent(date,date,allDay);
	  }
	  if(view.name == 'agendaDay'){
		  if(! allDay) return;
		  showCreateFCEvent(date,date,allDay);  
	  }
	  else if(view.name == 'month'){
		  //showCreateFCEvent(date,date,allDay);
		
		  calendar.fullCalendar('changeView', 'agendaDay')
	                .fullCalendar('gotoDate', date);
	      
	  }
	}

function deleteFCEvent(f){
	var url ="/cal?pAction=eventDelete";
	f.action=url;
	var fLoad = function(data){
		event = evalJSON(data);
		var id = event.id;
		calendar.fullCalendar('removeEvents', id );	
		};
	xhrSubmit(f,false,fLoad);
}
function dropHdlr(event,dayDelta,minuteDelta,allDay,revertFunc) {

     if (allDay) {
        alert("Event is now all-day");
    }else{
        //alert("Event has a time-of-day");
    }

	//calendar.fullCalendar('updateEvent',event);
    //editFCEvent(event);
    updateEventTimes(event);
}

function editCalendarEvent(evt){
	closeEventEdit();
	var id = evt.id;
	//get the full calendarevent record
	evt = getCalendarEventRecord(id);
	var opts = {};
	opts.editType = "Advanced";
	opts.height = 700;
	opts.width = 800;
	//opts.position = {my:"top", at: "top", of:"window"}
	editFCEvent(evt,null,null,opts);
}

function editFCEvent(evt, jsEvt, view, opts) {
	var divID = DIV_ID;
	var edit = $('#' + divID);
	if(!opts) opts = {};
	opts.title = "Event Details";
	//get the full calendarevent record
	var id = evt.id;
	evt = getCalendarEventRecord(evt);
	setEvtFields(evt);
	
	var str = getEditTemplate();
	str = supplant(str, evt);
	edit.html(str);
	
	$(".datepicker").datepicker();
	$(".timepicker").timepicker();
	setDateTimeField($('#frmEditEvent')[0].evtEndDate);
	var evtObj = $('#frmEditEvent')[0].evtObject;
	for(k in evt){
		var v = evt[k];
		evtObj[k] = v;
	}
	$('#flgAllDay').change(function(){
		setAllDayFields(this.checked);
	});
	$('#frmEditEvent .timepicker').change(function(){setDateTimeField(this);});
	$('#frmEditEvent .datepicker').change(function(){setDateTimeField(this);});

	setAllDayFields(evt.allDay);	
	
	//Put the event into the client memory
	globEvent = evt;
	setButtons('EDIT');
	showDialog(divID,opts);   
	
	//Return false to prevent automatic opening of the event.url
	return false;
}

function setAllDayFields(flg){
	if(flg){
		$('#frmEditEvent #timepicker').hide();
		//$('#divEvtEndDate').hide();
		$('#flgAllDay').prop('checked', true);
	}
	else{
		$('#frmEditEvent #timepicker').show();
	}
}



function fixEventSend(event){
	//Runs once per received event
	//Fix the boolean value in allDay
	var val = event.allday;
	if(!val) val = event.allDay;
	if(val == 't'|| val == "true") event.allDay = true;
	else event.allDay = false;
	return event;
}
function formatDateTime(myDate) {
	return (myDate.getMonth() + 1 + "/" + myDate.getDate() + "/"
			+ myDate.getFullYear() + " " + myDate.getHours() + ":" + myDate
			.getMinutes());
}
function formatDate(myDate) {
	return (myDate.getMonth() + 1 + "/" + myDate.getDate() + "/" + myDate
			.getFullYear());
}

function getCalendarEventRecord(evt){
	//Get the full CalendarEvent record
	//Returns an event object with all the FullCalendar fields + all the app specific fields
	var eventID = evt.id;
	var url = "/cal?pAction=eventRetrieve&eventID=" + eventID;
	var evtC;
	var fLoad = function(data){
		evtC = evalJSON(data);
		for(k in evt){
			evtC[k] = evt[k];
		}

	}
	xhrGet(url,true,fLoad);
	return evtC;	
}


function getDay(myDate) {
	return (myDate.getMonth() + 1 + "/" + myDate.getDate() + "/" + myDate
			.getFullYear());
}

function getCreateTemplate(){
	if(createTemplate) return createTemplate;
	var ts = new Date().getTime();
	var url=DIR_FC +"/template/CreateEditEvent.htm";
	url += "?" + ts;

	var tmp;
	var fLoad = function(data){
		tmp = data;
		createTemplate = tmp;
	}
	xhrGet(url,true,fLoad);
	return createTemplate;
}

function getEditTemplate(eventID){
	if(editTemplate) return editTemplate;
	var ts = new Date().getTime();
	var url;
	url=DIR_FC +"/template/CreateEditEvent.htm";
	url += "?_" + ts;
	/*
	if(eventID){
		//The full-blown CalendarEvent edit
		url = "/cal?pAction=eventEdit&eventID=" + eventID;
		url += "&_" + ts;

	}
	else{
		//The minimalist event editor
		url=DIR_FC +"/template/CreateEditEvent.htm";
		url += "?_" + ts;

	}*/
	var tmp;
	var fLoad = function(data){
		tmp = data;
		editTemplate = tmp;
	}
	xhrGet(url,true,fLoad);
	return editTemplate;
}
function resizeHdlr( event, dayDelta, minuteDelta, revertFunc, jsEvent, ui, view) {



	//calendar.fullCalendar('updateEvent',event);
   //editFCEvent(event);
   updateEventTimes(event);
}



function selectHdlr(start, end, allDay) {
	if(flgFirstClick){
		flgFirstClick = false;
		return;
	}
	var view = calendar.fullCalendar('getView');
	console.debug("View: " + view);
	var flgEventEdit = $('#eventEdit').is(":visible");
	if (flgEventEdit) {
		// Event edit window already displayed. Close it now
		closeEventEdit();
	} else {
		showCreateFCEvent(start, end, allDay);
		calendar.fullCalendar('unselect');
	}
}

function selectHdlrDemo(start, end, allDay) {
	var title = prompt('Event Title:');
	if (title) {
		calendar.fullCalendar('renderEvent', {
			title : title,
			start : start,
			end : end,
			allDay : allDay
		}, true // make the event "stick"
		);
	}
	calendar.fullCalendar('unselect');
}

function setEvtFields(evt){
	var startDate = moment(evt.start);
	var endDate = moment(evt.end);
	var startDisplay, endDisplay;
	var startString,endString;
	startDisplay = startDate.format(fmtDisplay);
	startString = startDate.format(fmtDateTime);
	evt.startString = startString;
	evt.startDisplay = startDisplay;
	evt.starttime = startDate.format(fmtTime);
	evt.startdate = startDate.format(fmtDay);

	if(endDate){
		endString = endDate.format(fmtDateTime);
		endDisplay = endDate.format(fmtDisplay);
		evt.endtime = endDate.format(fmtTime);
		evt.enddate = endDate.format(fmtDay);
		evt.endString = endString;
		evt.endDisplay = endDisplay;
	}
	evt.day = getDay(evt.start);
}

function setDateTimeField(el){
	var f = el.form;
	var dateStart = f.evtStartDate.value;
	var dateEnd = f.evtEndDate.value;
	var timeStart = f.evtStartTime.value;
	var timeEnd = f.evtEndTime.value;
	
	var start = moment(dateStart + " " + timeStart, fmtFC);
	var end = moment(dateEnd + " " + timeEnd, fmtFC);
	var zone = start.zone();
	f.evtStart.value = start.valueOf();
	f.evtEnd.value = end.valueOf();
	f.evtStartString.value=start.format(fmtDateTime);
	f.evtEndString.value=end.format(fmtDateTime);
	f.dateTimeString.value = dateStart+ " " + timeStart + "-" + dateEnd + " " + timeEnd;
}

function showCreateFCEvent(start, end, allDay) {

	var opts = new Array();
	opts.title = "Create Event";

	var divID = DIV_ID;
	var dCreate = $('#' + divID);

	var evt = {
			start : start,
			end : end,
			allDay : allDay,
			calendarid: calendarID
		}

	setEvtFields(evt);
	
	var str = getCreateTemplate();
	str = supplant(str, evt);
	dCreate.html(str);

	
	$(".datepicker").datepicker();
	$(".timepicker").timepicker();
	setDateTimeField($('#frmEditEvent')[0].evtEndDate);
	$('#frmEditEvent .timepicker').change(function(){setDateTimeField(this);});
	$('#frmEditEvent .datepicker').change(function(){setDateTimeField(this);});

	$('#flgAllDay').change(function(){
		setAllDayFields(this.checked);
	});
	setAllDayFields(evt.allDay);
	setButtons('CREATE');	
	showDialog(divID,opts);



}

function setButtons(mode){
	$(".evtButton").hide();
	if(mode == 'CREATE'){
		$('#btnCreateEvt').show();
		$('#btnCancelCreateEvt').show();
	}else{
		$('#btnUpdateEvt').show();
		$('#btnDeleteEvt').show();
		$('#btnCancelEditEvt').show();	
	}
}
function showDiv(id) {
	var divEdit = document.getElementById(id);
	jqID = "#" + id;
	var de = $(jqID);
	var offset = de.offset();
	var ww = $(window).width();
	var wh = $(window).height();

	var top = offset.top;
	var left = offset.left;
	var x = (ww - de.width()) / 2;
	var y = (wh - de.height()) / 2;

	divEdit.style.left = left + x + "px";
	divEdit.style.top = top + y + "px";
	divEdit.style.position = "absolute";
	// divEdit.style.display="block";

	// alert(divEdit.innerHTML);
	$(jqID).show();
}

function showDialog(id,opts){
	//id is a divID

	var div = document.getElementById(id);
	var jqID = "#" + id;
	var x = getHeightWidth(jqID);
	var h = x[0];
	var w = x[1];
	h=h<minHeight?minHeight:h;
	w=w<minWidth?minWidth:w;
	if(opts == null) opts ={};
	if(!opts.height) opts.height = h*1;
	if(!opts.width) opts.width = w*1;
	//opts = {height:800,width:600};
	$(jqID).dialog(opts);    

}

function toggleAdvanced(el){
	var divAEID = 'divAdvancedEdit';
	var jqAE = $('#'+divAEID);
	jqAE.toggle();
	
	var divAE = jqAE[0];
	if(divAE.style.display == "none") el.innerHTML = "+";
	else el.innerHTML = "-";
	
	var jq = $('#' +'eventWrapper');
	var div = jq[0];
	var h = div.scrollHeight + 100;
	$('#' + DIV_ID).dialog("option","height",h);

	return false;
}


function getHeightWidth(id) {
	//id is a jQuery id;
	//http://stackoverflow.com/questions/2345784/jquery-get-height-of-hidden-element-in-jquery
	//http://stackoverflow.com/users/13249/nick-craver
	$(id).css({
		position : 'absolute', // Optional if #myDiv is already absolute
		visibility : 'hidden',
		display : 'block'
	});

	var h = $(id).height();
	var w = $(id).width();

	$(id).css({
		position : 'static', // Again optional if #myDiv is already absolute
		visibility : 'visible',
		display : 'none'
	});
	return [h,w];
}


function updateFCEventForm(f,evt){
	if(!f){
		editFCEvent(evt);
	}
	var url ="/cal?pAction=eventUpdate";
	f.action=url;
	if(!evt) evt = globEvent;
	//Update evtStart and evtEnd
	//TODO
	var fLoad = function(data){
		event = evalJSON(data);
		var k,v;
		for(k in event){
			v = event[k];
			evt[k] = v;
		}
		evt.start = new Date(event.start);
		evt.end = new Date(event.end);
		evt.allDay = event.allDay;
		//if(evt.allDay) evt.end = null;
		calendar.fullCalendar('updateEvent',evt);
		//calendar.fullCalendar('renderEvent', event, true );	
		};
	xhrSubmit(f,false,fLoad);
	
}

function updateEventTimes(evt){
	var start = moment(evt.start);
	var end = moment(evt.end);
	var url = "/cal?pAction=eventUpdate";
	url += "&eventID=" + evt.id;
	url += "&calendarID=" + evt.calendarid;
	url +="&evtStartString=" + start.format(fmtDateTime);
	url +="&evtEndString=" + end.format(fmtDateTime);
	url +="&flgUpdate=true";
	xhrGet(url,false,null);
}

function updateAndCloseEvent(f){
	updateFCEventForm(f);
	closeEventEdit();
	return false;
}
