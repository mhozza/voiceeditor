var recognition = new webkitSpeechRecognition();
var mapping = null;
var commands = null;
var features = null;
var refresh_time = 10000;
var lines_start = [];
var current_line_start = '';
var current_line_end = '';
var lines_end = [];

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
            // for (var j in event.results[i]) {
            //     console.log(j.toString() + ":" + event.results[i][j].transcript);
            // }
            final_transcript += event.results[i][0].transcript;
        } else {
            interim_transcript += event.results[i][0].transcript;
        }
    }
    $('#voice_input').val(interim_transcript);
    process_input(final_transcript.trim().toLowerCase());
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
    // recognition.lang = 'sk-SK';
    recognition.start();
    // $("#editor").attr("readonly", "readonly");
    refresh_editor();

});

$(document).click(function(e) {
    e.stopPropagation();
    e.preventDefault();
    e.cancelBubble = true;
    e.stopImmediatePropagation();
    return false;
});

// $(document).bind('contextmenu', function(e) {
//     e.stopPropagation();
//     e.preventDefault();
//     e.cancelBubble = true;
//     e.stopImmediatePropagation();
//     return false;
// });

$(document).bind('selectstart', function(e) {
    e.stopPropagation();
    e.preventDefault();
    e.cancelBubble = true;
    e.stopImmediatePropagation();
    return false;
});




function set_mapping(value) {
    window.mapping = value;
}

function set_features(value) {
    window.features = {};
    for(var i in value) {
        window.features[value[i].fields.name] = true;
    }

    // if ('highlight' in window.features) {
    //     $("#editor").addClass('sh_pascal');
    // } else {
    //     $("#editor").removeClass('sh_pascal');
    // }
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
    console.log(window.mapping);
    console.log(window.features);
    console.log(window.commands);
    window.setTimeout("update_tables()", refresh_time);
}

function process_input(final_transcript) {
    command = get_command(final_transcript);
    console.log(command);
    if (command == null) {
        mapp = get_mapping(final_transcript)
        console.log(mapp);
        if (mapp == null) {
            insert_text(final_transcript);
        } else {
            insert_text(mapp);
        }
    } else {
        process_command(command);
    }
}

function process_command(command) {
    eval(command + "()");
}

function get_command(text) {
    for(var i in window.commands) {
        c = window.commands[i];
        if (c.fields.words == text) {
            return c.fields.command;
        }
    }
    return null;
}

function get_mapping(text) {
    for(var i in window.mapping) {
        m = window.mapping[i];
        if (m.fields.words == text) {
            return m.fields.chars;
        }
    }
    return null;
}

function insert_text(text) {
    if (text == '') {
        return;
    }
    if (features.autospace) {
        text = text + ' ';
    }
    // $('#editor').textrange('replace', text)
    // selection = $('#editor').textrange('get');
    // console.log(selection);
    // $('#editor').textrange('setcursor', selection_start.end);
    current_line_start += text;
    refresh_editor();

}

function refresh_editor() {
    editor = $('#editor');
    editor.empty();
    for (var i in lines_start) {
        editor.append("<li>"+ lines_start[i] +"</li>");
    }

    editor.append('<li class="current_line">' +current_line_start + '<div class="cursor"></div>' + current_line_end + "</li>");

    for (var i in lines_end) {
        editor.append("<li>"+ lines_end[i] +"</li>");
    }

    if (window.features != null && 'highlight' in window.features) {
        $('#editor').each(function(i, e) {hljs.highlightBlock(e)});
    }
}
