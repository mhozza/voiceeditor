var recognition = new webkitSpeechRecognition();
var mapping = null;
var commands = null;
var features = null;
var refresh_time = 10000;

recognition.continuous = true;
recognition.interimResults = true;
recognition.onstart = function() {
    console.info('Recognition started');
}
recognition.onresult = function(event) {
    var interim_transcript = '';
    var final_transcript = '';
    for (var i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
            final_transcript += event.results[i][0].transcript;
        } else {
            interim_transcript += event.results[i][0].transcript;
        }
    }
    $('#voice_input').val(interim_transcript);
    $('#editor').append(final_transcript);
};
recognition.onerror = function(event) {
    if (event.error == 'no-speech') {
        console.log('info_no_speech');
    }
    if (event.error == 'audio-capture') {
        console.log('info_no_microphone');
    }
    if (event.error == 'not-allowed') {
        if (event.timeStamp - start_timestamp < 100) {
            console.log('info_blocked');
        } else {
            console.log('info_denied');
        }
    }
};
recognition.onend = function() {
    console.info('recogition finished');
    recognition.start();
}
$(document).ready(function() {
    update_tables();
    final_transcript = '';
    recognition.lang = 'en-US';
    recognition.start();
});

function set_mapping(value) {
    window.mapping = value;
}

function set_features(value) {
    window.features = value;
}

function set_commands(value) {
    window.commands = value;
}

function update_tables() {
    $.ajax({
      url: "/api/features/",
    }).done(function(data) {
      features = data;
      set_features(data);
    });

    $.ajax({
      url: "/api/mapping/",
    }).success(function(data) {
      set_mapping(data);
    });

    $.ajax({
      url: "/api/commands/",
    }).success(function(data) {
      set_commands(data);
    });
    // console.log(window.mapping);
    // console.log(window.features);
    // console.log(window.commands);
    window.setTimeout("update_tables()", refresh_time);
}
