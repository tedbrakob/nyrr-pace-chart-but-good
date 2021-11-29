Highcharts.Chart.prototype.callbacks.push(function (chart) {
    Highcharts.addEvent(chart, 'load', onChartLoad);
});

function onChartLoad(e) {
    attachClickEventToGraphViewButton();

    let scope = getAngularScope();
    if(!scope.eventDetails || !scope.resultDetails) {
        //data is not yet loaded, abort
        return;
    }

    scope.resultDetails.splitResults = updateSplitData(scope);
}

function attachClickEventToGraphViewButton() {
    let buttonList = document.getElementsByClassName('graph-btn');
    if (buttonList.length == 1) {
        let button = buttonList[0];
        button.addEventListener('click', setChartData);
    }
}

function setChartData() {
    let scope = getAngularScope();
    let splits = scope.resultDetails.splitResults;
    
    let chartData = getChartDataFromSplits(splits);

    Highcharts.charts[1].series[0].setData(chartData, true);
    Highcharts.charts[1].tooltip.options.formatter = tooltipFormatter;
}

function getAngularScope() {
    return angular.element(document.querySelector('[ng-controller="runnerGraphController"]')).scope();
}

function updateSplitData(scope) {
    let splits = parseSplits(scope);
    return addPaceAndSpeedToSplits(splits);
}

function getEventDistanceMi(scope) {
    let eventDistanceKm = scope.eventDetails.distanceDimension;
    return kmToMiles(eventDistanceKm);
}

function getChartDataFromSplits(splits) {
    return splits.map((split) => { return {
        name: split.pace,
        y: split.speed,
    };});
}

function parseSplits(scope) {
    resultDetails = scope.resultDetails;

    let splits = resultDetails.splitResults.map((split) => {
        return {
            distance: split.distance ?? getSplitDistanceFromCode(split.splitCode),
            time: split.time,
            timeSeconds: timeStringToSeconds(split.time),
            splitCode: split.splitCode,
            splitName: split.splitName
        };
    });

    let finishDistance = getEventDistanceMi(scope);

    if(!lastSplitIsDistance(splits, finishDistance)) {
        splits.push({
            distance: finishDistance,
            time: resultDetails.timeOverall,
            timeSeconds: timeStringToSeconds(resultDetails.timeOverall),
            splitCode: "FINISH",
            splitName: null
        });
    }

    return splits;
}

function addPaceAndSpeedToSplits(splits) {
    splits.forEach(function(split, i) {
        if(i == 0) {
            milesBetween = split.distance;
            secondsBetween = split.timeSeconds;
        } else {
            previousSplit = splits[i - 1];
            milesBetween = split.distance - previousSplit.distance;
            secondsBetween = split.timeSeconds - previousSplit.timeSeconds;
        }

        splits[i].pace = getPaceMinutesPerMile(secondsBetween, milesBetween);
        splits[i].speed = getSpeedMilesPerHour(secondsBetween, milesBetween);
    });

    return splits;
}

function getSplitDistanceFromCode(splitCode) {
    let distance = parseInt(splitCode.replace(/[^0-9]/g, ''), 10); 
    let unit = splitCode.replace(/[0-9]/g, '');

    if (unit == 'K') {
        return kmToMiles(distance);
    }
    return distance;
}

function kmToMiles(kmDistance) {
    return +(kmDistance * 0.621371).toFixed(2);
}

function timeStringToSeconds(timeString) {
    let parsedTime = timeString.split(':');
    
    let seconds = (+parsedTime[0]) * 60 * 60 + (+parsedTime[1]) * 60 + (+parsedTime[2]); 
    
    return seconds;
}

function lastSplitIsDistance(splits, distanceMi) {
    let lastSplit = splits[splits.length - 1];
    return lastSplit.distance == distanceMi;
}

function getPaceMinutesPerMile(seconds, miles) {
    secondsPerMilePace = seconds/miles;

    let paceMinutes = ~~(secondsPerMilePace/60);
    let paceSeconds = secondsPerMilePace%60;

    paceSeconds = Math.floor(paceSeconds).toString().padStart(2, '0');

    return `${paceMinutes}:${paceSeconds}`;
}

function getSpeedMilesPerHour(seconds, miles) {
    hours = seconds / 60 / 60;
    return +(miles/hours).toFixed(1) ?? 0;
}

function tooltipFormatter () {
    var n = "<div><table><tr>";
    return $.each(this.points, function() {
        var t = moment.duration(this.key)
          , i = t.hours() + ":" + t.minutes().toString().padStart(2, '0');;
        n += '<td style="padding: 0px 10px; color: #9a9b9c; border-style: solid; border-width: 0px 1px 0px 0px"><div style="color: black"><span>PPM: <\/span><\/br><span">' + i + "<\/span><\/div><td>";
        n += '<td style="padding: 0px 10px; color: #9a9b9c;"><div style="color: black"><span>MPH: <\/span><\/br><span">' + this.y + "<\/span><\/div><td>"
    }),
    n += "<\/tr><\/table><\/div>"
}